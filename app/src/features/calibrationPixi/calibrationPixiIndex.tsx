import '@pixi/layout';
import '@pixi/layout/react';

import { Application, extend, useApplication, useTick } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';
import type { AppDispatch, RootState } from '../../stores/store';
import {
  setAudioOutputLatencySec,
  setCalibrationDone,
  setInputOffsetSec,
} from '../../stores/preference/preferenceSlice';
import { Quattro } from '../../functions/quattro/quattro';
import { StorageKey } from '../../functions/quattro/quattroApp/storageKey';
import { RouteMap } from '../../routes';
import type { CalibrationResult } from '../calibration/calibrationMath';
import { calculateCalibrationResult, secPerBeat } from '../calibration/calibrationMath';
import { useMidiNoteOn } from '../calibration/useMidiNoteOn';

extend({ Container, Graphics, Text });

const BPM = 80;
const COUNT_IN_BEATS = 4;
const PLOT_RANGE_MS = 100;

const BG = 0x0d0d1a;
const ACCENT = 0xff8c00;
const LATE_COLOR = 0xf97316;
const EARLY_COLOR = 0x38bdf8;
const WHITE = 0xffffff;
const DIM = 0x666688;
const SUCCESS_COLOR = 0x4ade80;
const ERROR_COLOR = 0xf87171;

enum Phase {
  WaitToStart,
  CountIn,
  Measuring,
  ResultFail,
  ResultSuccess,
}

// ── Expanding ring on hit ────────────────────────────────────────────────────

const HitRing = ({ cx, cy, onComplete }: { cx: number; cy: number; onComplete: () => void }) => {
  const progress = useRef(0);
  const [radius, setRadius] = useState(0);
  const [alpha, setAlpha] = useState(1);

  useTick((ticker) => {
    progress.current = Math.min(1, progress.current + ticker.deltaMS / 500);
    setRadius(progress.current * 200);
    setAlpha(1 - progress.current);
    if (progress.current >= 1) onComplete();
  });

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (alpha <= 0) return;
      g.circle(cx, cy, radius);
      g.stroke({ color: SUCCESS_COLOR, width: 3, alpha });
    },
    [cx, cy, radius, alpha],
  );

  return <pixiGraphics draw={draw} />;
};

// ── Beat pulse (count-in) ────────────────────────────────────────────────────

const BeatPulse = ({ cx, cy, triggerKey }: { cx: number; cy: number; triggerKey: number }) => {
  const elapsed = useRef(0);
  const active = useRef(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    elapsed.current = 0;
    active.current = true;
  }, [triggerKey]);

  useTick((ticker) => {
    if (!active.current) return;
    elapsed.current += ticker.deltaMS;
    const t = Math.min(1, elapsed.current / 200);
    // quick out, then back to 1
    setScale(1 + 0.3 * Math.sin(t * Math.PI));
    if (t >= 1) {
      setScale(1);
      active.current = false;
    }
  });

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      const r = 60 * scale;
      g.circle(cx, cy, r);
      g.fill({ color: ACCENT, alpha: 0.15 });
      g.circle(cx, cy, r);
      g.stroke({ color: ACCENT, width: 3, alpha: 0.8 });
    },
    [cx, cy, scale],
  );

  return <pixiGraphics draw={draw} />;
};

// ── Scatter plot ──────────────────────────────────────────────────────────────

const ScatterPlot = ({
  deviationsMs,
  cx,
  y,
  width,
}: {
  deviationsMs: number[];
  cx: number;
  y: number;
  width: number;
}) => {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      const half = width / 2;

      // axis
      g.moveTo(cx - half, y);
      g.lineTo(cx + half, y);
      g.stroke({ color: DIM, width: 1 });

      // center tick
      g.moveTo(cx, y - 10);
      g.lineTo(cx, y + 10);
      g.stroke({ color: DIM, width: 1 });

      // edge ticks
      g.moveTo(cx - half, y - 5);
      g.lineTo(cx - half, y + 5);
      g.stroke({ color: DIM, width: 1 });
      g.moveTo(cx + half, y - 5);
      g.lineTo(cx + half, y + 5);
      g.stroke({ color: DIM, width: 1 });

      // dots
      deviationsMs.forEach((ms) => {
        const clamped = Math.max(-PLOT_RANGE_MS, Math.min(PLOT_RANGE_MS, ms));
        const x = cx + (clamped / PLOT_RANGE_MS) * half;
        const color = ms > 0 ? LATE_COLOR : EARLY_COLOR;
        g.circle(x, y, 6);
        g.fill({ color, alpha: 0.85 });
      });
    },
    [deviationsMs, cx, y, width],
  );

  return <pixiGraphics draw={draw} />;
};

// ── Scene (needs useApplication for screen size) ──────────────────────────────

const CalibrationScene = ({
  phase,
  countBeat,
  beatTrigger,
  rings,
  onRingComplete,
  result,
}: {
  phase: Phase;
  countBeat: number;
  beatTrigger: number;
  rings: number[];
  onRingComplete: (id: number) => void;
  result: CalibrationResult | null;
}) => {
  const { app } = useApplication();
  const W = app.screen.width;
  const H = app.screen.height;
  const CX = W / 2;

  const mainText = () => {
    switch (phase) {
      case Phase.WaitToStart: return 'Hit any pad to start';
      case Phase.CountIn: return countBeat > 0 ? String(countBeat) : '';
      case Phase.Measuring: return '';
      case Phase.ResultFail: return 'Not enough data';
      case Phase.ResultSuccess:
        if (!result) return '';
        return result.signedTotalMs > 0
          ? `+${result.signedTotalMs}ms late`
          : `${result.signedTotalMs}ms early`;
    }
  };

  const mainColor = () => {
    if (phase === Phase.ResultFail) return ERROR_COLOR;
    if (phase === Phase.ResultSuccess) {
      if (!result) return WHITE;
      return result.signedTotalMs > 0 ? LATE_COLOR : EARLY_COLOR;
    }
    return WHITE;
  };

  const subtitleText = () => {
    switch (phase) {
      case Phase.WaitToStart: return 'Hit a pad on each tick you hear';
      case Phase.ResultFail: return 'Hit any pad to try again';
      case Phase.ResultSuccess: return 'Hit any pad to continue';
      default: return '';
    }
  };

  return (
    <>
      {/* Background */}
      <pixiGraphics
        draw={(g) => {
          g.clear();
          g.rect(0, 0, W, H);
          g.fill({ color: BG });
        }}
      />

      {/* Beat pulse */}
      {phase === Phase.CountIn && (
        <BeatPulse cx={CX} cy={H * 0.38} triggerKey={beatTrigger} />
      )}

      {/* Hit rings */}
      {rings.map((id) => (
        <HitRing key={id} cx={CX} cy={H * 0.5} onComplete={() => onRingComplete(id)} />
      ))}

      {/* Main text */}
      {mainText() !== '' && (
        <pixiText
          x={CX}
          y={H * 0.35}
          text={mainText()}
          anchor={{ x: 0.5, y: 0.5 }}
          style={{
            fontSize: phase === Phase.CountIn ? 96 : 40,
            fill: mainColor(),
            fontWeight: 'bold',
          }}
        />
      )}

      {/* Subtitle */}
      {subtitleText() !== '' && (
        <pixiText
          x={CX}
          y={H * 0.5}
          text={subtitleText()}
          anchor={{ x: 0.5, y: 0.5 }}
          style={{ fontSize: 18, fill: DIM }}
        />
      )}

      {/* Result breakdown */}
      {phase === Phase.ResultSuccess && result && (
        <>
          <ScatterPlot
            deviationsMs={result.deviationsMs}
            cx={CX}
            y={H * 0.62}
            width={Math.min(W * 0.8, 360)}
          />
          {/* axis labels */}
          <pixiText
            x={CX - Math.min(W * 0.4, 180)}
            y={H * 0.62 + 16}
            text={`-${PLOT_RANGE_MS}ms`}
            anchor={{ x: 0.5, y: 0 }}
            style={{ fontSize: 11, fill: EARLY_COLOR }}
          />
          <pixiText
            x={CX}
            y={H * 0.62 + 16}
            text='0'
            anchor={{ x: 0.5, y: 0 }}
            style={{ fontSize: 11, fill: DIM }}
          />
          <pixiText
            x={CX + Math.min(W * 0.4, 180)}
            y={H * 0.62 + 16}
            text={`+${PLOT_RANGE_MS}ms`}
            anchor={{ x: 0.5, y: 0 }}
            style={{ fontSize: 11, fill: LATE_COLOR }}
          />

          {/* stat rows */}
          {[
            { label: 'Total end-to-end', value: `${result.signedTotalMs > 0 ? '+' : ''}${result.signedTotalMs}ms`, color: WHITE },
            { label: 'Audio output (browser)', value: `${result.audioOutputLatencyMs}ms`, color: DIM },
            { label: 'Input lag + reaction', value: `${result.inputPlusReactionMs > 0 ? '+' : ''}${result.inputPlusReactionMs}ms`, color: DIM },
            { label: `Spread ±1σ · ${result.hitCount} hits`, value: `±${result.stdDevMs}ms`, color: DIM },
          ].map((row, i) => (
            <pixiContainer key={i} x={CX} y={H * 0.72 + i * 26}>
              <pixiText
                x={-Math.min(W * 0.38, 160)}
                y={0}
                text={row.label}
                anchor={{ x: 0, y: 0.5 }}
                style={{ fontSize: 14, fill: row.color }}
              />
              <pixiText
                x={Math.min(W * 0.38, 160)}
                y={0}
                text={row.value}
                anchor={{ x: 1, y: 0.5 }}
                style={{ fontSize: 14, fill: row.color, fontWeight: i === 0 ? 'bold' : 'normal' }}
              />
            </pixiContainer>
          ))}

          {/* divider */}
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.moveTo(CX - 160, H * 0.715);
              g.lineTo(CX + 160, H * 0.715);
              g.stroke({ color: DIM, width: 0.5, alpha: 0.4 });
            }}
          />

          {/* success dot */}
          <pixiGraphics
            draw={(g) => {
              g.clear();
              g.circle(CX, H * 0.3, 6);
              g.fill({ color: SUCCESS_COLOR });
            }}
          />
        </>
      )}
    </>
  );
};

// ── Root export ───────────────────────────────────────────────────────────────

export const CalibrationPixiIndex = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const activeMidiDevice = useSelector((s: RootState) => s.midiDevice.activeMidiDevice);
  const parentRef = useRef<HTMLDivElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<Phase>(Phase.WaitToStart);
  const hitTimesRef = useRef<number[]>([]);
  const musicStartMsRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>(Phase.WaitToStart);
  const [countBeat, setCountBeat] = useState<number>(0);
  const [beatTrigger, setBeatTrigger] = useState<number>(0);
  const [rings, setRings] = useState<number[]>([]);
  const nextRingId = useRef(0);
  const [result, setResult] = useState<CalibrationResult | null>(null);

  const spb = secPerBeat(BPM);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const startSession = () => {
    hitTimesRef.current = [];
    setCountBeat(0);
    setResult(null);
    setRings([]);

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    musicStartMsRef.current = performance.now();
    audio.play().catch(console.error);
    setPhaseSync(Phase.CountIn);
  };

  const finishSession = () => {
    let audioOutputLatency = 0;
    try {
      const ac = new AudioContext();
      audioOutputLatency = ac.outputLatency ?? ac.baseLatency ?? 0;
      ac.close();
      // eslint-disable-next-line no-empty
    } catch {}

    const r = calculateCalibrationResult(hitTimesRef.current, BPM, audioOutputLatency);

    if (r === null) {
      setPhaseSync(Phase.ResultFail);
      return;
    }

    setResult(r);
    const totalSec = r.signedTotalMs / 1000;
    const audioOutSec = r.audioOutputLatencyMs / 1000;
    dispatch(setInputOffsetSec(totalSec));
    dispatch(setAudioOutputLatencySec(audioOutSec));
    dispatch(setCalibrationDone(true));
    Quattro.app.setStorage2(StorageKey.InputOffsetSec, String(totalSec));
    Quattro.app.setStorage2(StorageKey.AudioOutputLatencySec, String(audioOutSec));
    Quattro.app.setStorage2(StorageKey.CalibrationDone, 'true');
    setPhaseSync(Phase.ResultSuccess);
  };

  const handleNoteOn = (_note: number, _velocity: number) => {
    switch (phaseRef.current) {
      case Phase.WaitToStart:
        startSession();
        break;
      case Phase.Measuring: {
        const hitSec = (performance.now() - musicStartMsRef.current) / 1000;
        hitTimesRef.current.push(hitSec);
        setRings((r) => [...r, nextRingId.current++]);
        break;
      }
      case Phase.ResultFail:
        setPhaseSync(Phase.WaitToStart);
        break;
      case Phase.ResultSuccess:
        navigate(`/${RouteMap.root.path}/${RouteMap.preference.path}`);
        break;
      default:
        break;
    }
  };

  useMidiNoteOn(handleNoteOn);

  // RAF: count-in sync
  useEffect(() => {
    let prevBeat = -1;
    const loop = (ts: number) => {
      prevTimeRef.current = ts;
      const audio = audioRef.current;

      if (phaseRef.current === Phase.CountIn && audio) {
        const beat = Math.floor(audio.currentTime / spb);
        if (beat !== prevBeat) {
          prevBeat = beat;
          setCountBeat(Math.min(beat + 1, COUNT_IN_BEATS));
          setBeatTrigger((n) => n + 1);
        }
        if (audio.currentTime >= spb * COUNT_IN_BEATS) {
          setPhaseSync(Phase.Measuring);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };
    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [spb]);

  // Audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (phaseRef.current === Phase.Measuring) finishSession();
    };
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Device disconnect
  useEffect(() => {
    const p = phaseRef.current;
    if (activeMidiDevice === undefined && (p === Phase.CountIn || p === Phase.Measuring)) {
      audioRef.current?.pause();
      navigate(`/${RouteMap.root.path}/${RouteMap.home.path}`);
    }
  }, [activeMidiDevice, navigate]);

  // Keyboard debug
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') handleNoteOn(38, 100);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRingComplete = useCallback((id: number) => {
    setRings((r) => r.filter((x) => x !== id));
  }, []);

  return (
    <Box ref={parentRef} width='100%' height='100%'>
      <audio ref={audioRef} src='assets/calibration.ogg' preload='auto' />
      <Application
        resizeTo={parentRef}
        resolution={window.devicePixelRatio || 1}
        autoDensity
        background={BG}
      >
        <CalibrationScene
          phase={phase}
          countBeat={countBeat}
          beatTrigger={beatTrigger}
          rings={rings}
          onRingComplete={handleRingComplete}
          result={result}
        />
      </Application>
    </Box>
  );
};
