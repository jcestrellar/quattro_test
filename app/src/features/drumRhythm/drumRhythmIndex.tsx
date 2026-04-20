import '@pixi/layout';
import '@pixi/layout/react';

import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import type { RootState } from '../../stores/store';
import { RouteMap } from '../../routes';
import { useMidiNoteOn } from '../calibration/useMidiNoteOn';
import type { ChartParser, MidiNote } from './chartTypes';
import type { ChartMeta } from './chartTypes';
import { MIDI_TO_LANE, KEY_LANE_MAP } from './drumPadMap';
import { AudioEngine } from './audioEngine';
import { initialScore, applyJudgement } from './scoring';
import type { ScoreState, Judgement } from './scoring';
import { useChartLoader } from './useChartLoader';
import { Highway } from './components/highway';
import { ScoreHud } from './components/scoreHud';

extend({ Container, Graphics, Text });

type GamePhase = 'idle' | 'playing' | 'result';

// ── Stable Pixi canvas — memoized so score/phase updates NEVER re-render it ──
interface PixiCanvasProps {
  parentRef: React.RefObject<HTMLDivElement | null>;
  chart: MidiNote[];
  audioEngine: AudioEngine;
  inputOffsetSec: number;
  onJudgement: (j: Judgement) => void;
  registerHitHandler: (fn: (midi: number) => void) => void;
}

const PixiCanvas = memo(
  ({ parentRef, chart, audioEngine, inputOffsetSec, onJudgement, registerHitHandler }: PixiCanvasProps) => (
    <Application
      resizeTo={parentRef}
      resolution={window.devicePixelRatio || 1}
      autoDensity
      background={0x0a0a1a}
    >
      <Highway
        chart={chart}
        audioEngine={audioEngine}
        inputOffsetSec={inputOffsetSec}
        onJudgement={onJudgement}
        registerHitHandler={registerHitHandler}
      />
    </Application>
  ),
);
PixiCanvas.displayName = 'PixiCanvas';

interface DrumRhythmIndexProps {
  parser: ChartParser;
}

export const DrumRhythmIndex = ({ parser }: DrumRhythmIndexProps) => {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  const [audioEngine] = useState(() => new AudioEngine());
  const hitHandlerRef = useRef<((midi: number) => void) | null>(null);

  const inputOffsetSec = useSelector((s: RootState) => s.preference.inputOffsetSec) ?? 0;
  const calibrationDone = useSelector((s: RootState) => s.preference.calibrationDone);

  const { chart, meta, status, error } = useChartLoader(parser);

  const [phase, setPhase] = useState<GamePhase>('idle');
  const phaseRef = useRef<GamePhase>('idle');
  const [score, setScore] = useState<ScoreState>(initialScore());
  const scoreRef = useRef<ScoreState>(initialScore());

  const setPhaseSync = useCallback((p: GamePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Load audio when chart ready
  useEffect(() => {
    if (status !== 'ready') return;
    audioEngine.load('assets/song.ogg').catch(console.error);
    return () => { audioEngine.dispose(); };
  }, [status, audioEngine]);

  // Detect end of song
  useEffect(() => {
    if (phase !== 'playing') return;
    audioEngine.onEnded(() => setPhaseSync('result'));
  }, [phase, audioEngine, setPhaseSync]);

  // handleJudgement is stable — doesn't change on re-render
  const handleJudgement = useCallback((j: Judgement) => {
    const next = applyJudgement(scoreRef.current, j);
    scoreRef.current = next;
    setScore(next);
  }, []);

  const registerHitHandler = useCallback((fn: (midi: number) => void) => {
    hitHandlerRef.current = fn;
  }, []);

  const triggerHit = useCallback(
    async (midi: number) => {
      if (phaseRef.current === 'result') return;
      if (phaseRef.current === 'idle') {
        await audioEngine.resume();
        audioEngine.start();
        setPhaseSync('playing');
      }
      hitHandlerRef.current?.(midi);
    },
    [audioEngine, setPhaseSync],
  );

  useMidiNoteOn((note) => {
    if (MIDI_TO_LANE[note] !== undefined) triggerHit(note);
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const LANE_MIDI: Record<number, number> = { [-1]: 36, 0: 38, 1: 42, 2: 48, 3: 49 };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lane = KEY_LANE_MAP[e.key];
      if (lane !== undefined) triggerHit(LANE_MIDI[lane as number] ?? 38);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [triggerHit]);

  const handleCalibrate = useCallback(() => {
    navigate(`/${RouteMap.root.path}/${RouteMap.calibrationPixi.path}`);
  }, [navigate]);

  return (
    <Box ref={parentRef} width='100%' height='100%' position='relative' overflow='hidden'>
      {status === 'loading' && (
        <Box display='flex' alignItems='center' justifyContent='center' sx={{ position: 'absolute', inset: 0 }}>
          <Box color='white'>Loading chart…</Box>
        </Box>
      )}
      {status === 'error' && (
        <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' gap={1} sx={{ position: 'absolute', inset: 0, p: 2 }}>
          <Box color='#f87171' fontWeight='bold'>Failed to load chart</Box>
          <Box color='#fca5a5' fontSize='0.75rem' textAlign='center' sx={{ wordBreak: 'break-all' }}>{error}</Box>
        </Box>
      )}
      {status === 'ready' && chart && (
        <>
          <PixiCanvas
            parentRef={parentRef}
            chart={chart.notes}
            audioEngine={audioEngine}
            inputOffsetSec={inputOffsetSec}
            onJudgement={handleJudgement}
            registerHitHandler={registerHitHandler}
          />
          <ScoreHud
            score={score}
            phase={phase}
            meta={meta as ChartMeta | null}
            calibrationDone={calibrationDone}
            inputOffsetSec={inputOffsetSec}
            onCalibrate={handleCalibrate}
          />
        </>
      )}
    </Box>
  );
};
