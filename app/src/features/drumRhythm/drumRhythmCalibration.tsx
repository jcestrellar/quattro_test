import '@pixi/layout';
import '@pixi/layout/react';

import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import type { AppDispatch } from '../../stores/store';
import { setCalibrationDone, setInputOffsetSec } from '../../stores/preference/preferenceSlice';
import { useMidiNoteOn } from '../calibration/useMidiNoteOn';
import { median } from '../calibration/calibrationMath';
import { DrumLane, LANE_COLORS, KEY_LANE_MAP, MIDI_TO_LANE } from './drumPadMap';
import { RouteMap } from '../../routes';

extend({ Container, Graphics, Text });

// ── Constants ────────────────────────────────────────────────────────────────

const BPM = 90;
const BEAT_SEC = 60 / BPM;
const LEAD_IN_BEATS = 4;
const CALIB_BEATS = 20;
const START_SEC = LEAD_IN_BEATS * BEAT_SEC;
const ACCEPT_WIN_SEC = 0.35;
const MIN_HITS = 10;
const LOOK_AHEAD_SEC = 1.5;
const HIT_LINE_RATIO = 0.72;

interface CalibNote {
  timeSec: number;
  consumed: boolean;
}

function makeNotes(): CalibNote[] {
  return Array.from({ length: CALIB_BEATS }, (_, i) => ({
    timeSec: START_SEC + i * BEAT_SEC,
    consumed: false,
  }));
}

function scheduleClick(ctx: AudioContext, at: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.4, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.07);
}

// ── Highway inner (must be inside <Application>) ─────────────────────────────

interface InnerProps {
  notesRef: React.RefObject<CalibNote[]>;
  ctxRef: React.RefObject<AudioContext | null>;
  startCtxTimeRef: React.RefObject<number>;
  isRunningRef: React.RefObject<boolean>;
  registerHitHandler: (fn: (midi: number) => void) => void;
  onHit: (deltaSec: number) => void;
}

const CalibHighwayInner = ({
  notesRef,
  ctxRef,
  startCtxTimeRef,
  isRunningRef,
  registerHitHandler,
  onHit,
}: InnerProps) => {
  const { app } = useApplication();
  const gRef = useRef<Graphics | null>(null);
  const litUntilRef = useRef(0);

  useEffect(() => {
    const g = new Graphics();
    gRef.current = g;
    app.stage.addChildAt(g, 0);
    return () => {
      app.stage.removeChild(g);
      g.destroy();
      gRef.current = null;
    };
  }, [app]);

  useEffect(() => {
    const handler = (midi: number) => {
      litUntilRef.current = performance.now() + 130;
      if (!isRunningRef.current) return;

      const ctx = ctxRef.current;
      if (!ctx || startCtxTimeRef.current === 0) return;
      const currentTime = ctx.currentTime - startCtxTimeRef.current;

      const notes = notesRef.current;
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < notes.length; i++) {
        if (notes[i].consumed) continue;
        const delta = currentTime - notes[i].timeSec;
        if (Math.abs(delta) < ACCEPT_WIN_SEC && Math.abs(delta) < bestDist) {
          bestDist = Math.abs(delta);
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        notes[bestIdx].consumed = true;
        onHit(currentTime - notes[bestIdx].timeSec);
      }
    };
    registerHitHandler(handler);
  }, [notesRef, ctxRef, startCtxTimeRef, isRunningRef, registerHitHandler, onHit]);

  useTick(() => {
    const g = gRef.current;
    if (!g || !app.renderer) return;

    const W = app.screen.width;
    const H = app.screen.height;
    const HIT_LINE_Y = H * HIT_LINE_RATIO;
    const PPS = HIT_LINE_Y / LOOK_AHEAD_SEC;
    const BAR_Y = HIT_LINE_Y + 12;
    const now = performance.now();
    const lit = litUntilRef.current > now;

    const ctx = ctxRef.current;
    const currentTime =
      ctx && startCtxTimeRef.current > 0
        ? ctx.currentTime - startCtxTimeRef.current
        : -LOOK_AHEAD_SEC;

    g.clear();

    // Background
    g.rect(0, 0, W, H);
    g.fill({ color: 0x0a0a1a });

    // Count-in guide lines (beat grid visible on highway)
    for (let b = 0; b < LEAD_IN_BEATS + CALIB_BEATS + 2; b++) {
      const beatTime = b * BEAT_SEC;
      const timeAhead = beatTime - currentTime;
      if (timeAhead < 0 || timeAhead > LOOK_AHEAD_SEC + 0.1) continue;
      const y = HIT_LINE_Y - timeAhead * PPS;
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke({ color: 0x222244, width: 1, alpha: 0.5 });
    }

    // Hit line — glow + core
    g.moveTo(0, HIT_LINE_Y);
    g.lineTo(W, HIT_LINE_Y);
    g.stroke({ color: 0xffffff, width: 10, alpha: 0.12 });
    g.moveTo(0, HIT_LINE_Y);
    g.lineTo(W, HIT_LINE_Y);
    g.stroke({ color: 0xffffff, width: 4, alpha: 0.55 });
    g.moveTo(0, HIT_LINE_Y);
    g.lineTo(W, HIT_LINE_Y);
    g.stroke({ color: 0xffffff, width: 1.5, alpha: 1.0 });

    // Notes (kick bars)
    const kickColor = LANE_COLORS[DrumLane.Kick];
    for (const note of notesRef.current) {
      if (note.consumed) continue;
      const timeAhead = note.timeSec - currentTime;
      if (timeAhead > LOOK_AHEAD_SEC + 0.1) continue;
      if (timeAhead < -0.15) continue;
      const y = HIT_LINE_Y - timeAhead * PPS;
      g.rect(0, y - 7, W, 14);
      g.fill({ color: kickColor });
      g.rect(0, y - 7, W, 14);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    }

    // Kick bar at bottom
    g.roundRect(4, BAR_Y, W - 8, 36, 6);
    g.fill({ color: lit ? kickColor : 0x111120 });
    g.roundRect(4, BAR_Y, W - 8, 36, 6);
    g.stroke({ color: kickColor, width: lit ? 3 : 2, alpha: lit ? 1 : 0.6 });
  });

  return null;
};

// ── Memoized canvas wrapper ───────────────────────────────────────────────────

interface CanvasProps extends InnerProps {
  parentRef: React.RefObject<HTMLDivElement | null>;
}

const CalibCanvas = memo(({ parentRef, ...inner }: CanvasProps) => (
  <Application
    resizeTo={parentRef}
    resolution={window.devicePixelRatio || 1}
    autoDensity
    background={0x0a0a1a}
  >
    <CalibHighwayInner {...inner} />
  </Application>
));
CalibCanvas.displayName = 'CalibCanvas';

// ── Main component ────────────────────────────────────────────────────────────

export const DrumRhythmCalibration = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const startCtxTimeRef = useRef<number>(0);
  const isRunningRef = useRef(false);
  const hitHandlerRef = useRef<((midi: number) => void) | null>(null);
  const notesRef = useRef<CalibNote[]>(makeNotes());

  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [deltas, setDeltas] = useState<number[]>([]);
  const [lastDeltaMs, setLastDeltaMs] = useState<number | null>(null);

  const registerHitHandler = useCallback((fn: (midi: number) => void) => {
    hitHandlerRef.current = fn;
  }, []);

  const onHit = useCallback((deltaSec: number) => {
    setLastDeltaMs(Math.round(deltaSec * 1000));
    setDeltas((prev) => [...prev, deltaSec]);
  }, []);

  const start = useCallback(async () => {
    const ctx = new AudioContext();
    await ctx.resume();
    ctxRef.current = ctx;

    notesRef.current = makeNotes();
    setDeltas([]);
    setLastDeltaMs(null);
    isRunningRef.current = true;

    const t0 = ctx.currentTime + 0.15;
    startCtxTimeRef.current = t0;

    // Schedule a click at every beat (including lead-in)
    const totalBeats = LEAD_IN_BEATS + CALIB_BEATS;
    for (let b = 0; b < totalBeats; b++) {
      scheduleClick(ctx, t0 + b * BEAT_SEC);
    }

    setPhase('running');

    const totalMs = (START_SEC + CALIB_BEATS * BEAT_SEC + 0.8) * 1000;
    setTimeout(() => {
      isRunningRef.current = false;
      setPhase('done');
    }, totalMs);
  }, []);

  const save = useCallback(() => {
    if (deltas.length < MIN_HITS) return;
    const med = median(deltas);
    dispatch(setInputOffsetSec(med));
    dispatch(setCalibrationDone(true));
    navigate(-1);
  }, [deltas, dispatch, navigate]);

  const triggerHit = useCallback((midi: number) => {
    hitHandlerRef.current?.(midi);
  }, []);

  useMidiNoteOn((note) => {
    if (MIDI_TO_LANE[note] !== undefined) triggerHit(note);
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (KEY_LANE_MAP[e.key] !== undefined) triggerHit(36);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerHit]);

  useEffect(() => () => { ctxRef.current?.close(); }, []);

  const hitCount = deltas.length;
  const medianMs = hitCount >= MIN_HITS ? Math.round(median(deltas) * 1000) : null;

  const deltaColor =
    lastDeltaMs === null ? '#aaa'
    : Math.abs(lastDeltaMs) < 20 ? '#4ade80'
    : Math.abs(lastDeltaMs) < 50 ? '#ffd700'
    : '#f87171';

  return (
    <Box ref={parentRef} width="100%" height="100%" position="relative" overflow="hidden">
      <CalibCanvas
        parentRef={parentRef}
        notesRef={notesRef}
        ctxRef={ctxRef}
        startCtxTimeRef={startCtxTimeRef}
        isRunningRef={isRunningRef}
        registerHitHandler={registerHitHandler}
        onHit={onHit}
      />

      {/* Top HUD */}
      <Box
        position="absolute"
        top={16}
        left={0}
        right={0}
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={0.5}
        sx={{ pointerEvents: 'none' }}
      >
        <Typography variant="h6" color="white" fontWeight="bold">
          Visual Calibration
        </Typography>
        {phase === 'running' && (
          <>
            <Typography variant="body2" color="#aaa">
              Hit any pad as the bar crosses the line
            </Typography>
            <Typography variant="body1" color="white" fontWeight="bold">
              {hitCount} / {CALIB_BEATS}
            </Typography>
            {lastDeltaMs !== null && (
              <Typography variant="h6" fontWeight="bold" sx={{ color: deltaColor }}>
                {lastDeltaMs > 0 ? `+${lastDeltaMs}` : lastDeltaMs}ms
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Idle overlay */}
      {phase === 'idle' && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={3}
          sx={{ position: 'absolute', inset: 0 }}
        >
          <Typography variant="body1" color="#ccc" textAlign="center" px={4} lineHeight={1.6}>
            Orange bars will fall to the hit line.{'\n'}
            Hit any pad each time one reaches it.{'\n'}
            A click will confirm the beat.
          </Typography>
          <Box display="flex" gap={2} sx={{ pointerEvents: 'auto' }}>
            <Button variant="contained" size="large" onClick={start}>
              Start
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
              onClick={() => navigate(`/${RouteMap.root.path}/${RouteMap.home.path}`)}
            >
              Back
            </Button>
          </Box>
        </Box>
      )}

      {/* Result overlay */}
      {phase === 'done' && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={2}
          bgcolor="rgba(0,0,0,0.88)"
          sx={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
        >
          <Typography variant="h5" color="white" fontWeight="bold">
            Result
          </Typography>
          <Typography variant="body2" color="#aaa">
            {hitCount} hits recorded
          </Typography>

          {medianMs !== null ? (
            <>
              <Typography
                variant="h3"
                fontWeight="bold"
                sx={{ color: medianMs === 0 ? '#4ade80' : medianMs > 0 ? '#ffd700' : '#60a5fa' }}
              >
                {medianMs > 0 ? `+${medianMs}` : medianMs}ms
              </Typography>
              <Typography variant="caption" color="#888" textAlign="center">
                {medianMs > 0
                  ? 'You hit late — the window will shift forward'
                  : medianMs < 0
                  ? 'You hit early — the window will shift back'
                  : 'Perfect timing'}
              </Typography>
              <Box display="flex" gap={2} mt={1}>
                <Button variant="contained" onClick={save}>
                  Save & apply
                </Button>
                <Button
                  variant="outlined"
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                  onClick={start}
                >
                  Retry
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography color="#f87171">
                Not enough hits ({hitCount} / {MIN_HITS} needed)
              </Typography>
              <Button
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }}
                onClick={start}
              >
                Retry
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};
