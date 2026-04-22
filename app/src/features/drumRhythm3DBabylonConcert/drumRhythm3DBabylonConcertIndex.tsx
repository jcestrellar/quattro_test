import { Color3 } from '@babylonjs/core';
import { SceneInstrumentation } from '@babylonjs/core/Instrumentation/sceneInstrumentation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import type { RootState } from '../../stores/store';
import { useMidiNoteOn } from '../calibration/useMidiNoteOn';
import { useChartLoader } from '../drumRhythm/useChartLoader';
import { parseTonejs } from '../drumRhythm/midiParser/parseTonejs';
import { AudioEngine } from '../drumRhythm/audioEngine';
import { DrumLane, KEY_LANE_MAP, MIDI_TO_LANE } from '../drumRhythm/drumPadMap';
import { applyJudgement, initialScore, judge, WINDOWS_SEC } from '../drumRhythm/scoring';
import type { Judgement, ScoreState } from '../drumRhythm/scoring';
import { ScoreHud } from '../drumRhythm/components/scoreHud';
import type { ChartMeta } from '../drumRhythm/chartTypes';
import { RouteMap } from '../../routes';
import { CONCERT_PERF } from './stage/concertPerf';
import { createConcertStageScene, type ConcertStageHandles } from './stage/concertStageScene';
import {
  LOOK_AHEAD_SEC,
  SPEED,
  buildConcertHighway,
} from './stage/concertHighway';
import { DrumKitHitReaction } from './stage/drumKitHitReaction';
import { StylizedHitVfx, type HitVfxKind } from './stage/stylizedHitVfx';

type GamePhase = 'idle' | 'playing' | 'result';

function judgementToHitVfx(j: Judgement): HitVfxKind {
  if (j === 'perfect') return 'perfect';
  if (j === 'good' || j === 'ok') return 'good';
  return 'neutral';
}

const DEV_LANE_MIDI: Record<number, number> = { [-1]: 36, 0: 38, 1: 42, 2: 48, 3: 49 };

interface ConcertSceneDebug {
  fps: number;
  drawCalls: number;
  vertices: number;
  indices: number;
  triangles: number;
  activeMeshes: number;
  meshes: number;
  transformNodes: number;
  lights: number;
  cameras: number;
  materials: number;
  textures: number;
  particles: number;
  bones: number;
}

const EMPTY_SCENE_DEBUG: ConcertSceneDebug = {
  fps: 0,
  drawCalls: 0,
  vertices: 0,
  indices: 0,
  triangles: 0,
  activeMeshes: 0,
  meshes: 0,
  transformNodes: 0,
  lights: 0,
  cameras: 0,
  materials: 0,
  textures: 0,
  particles: 0,
  bones: 0,
};

export const DrumRhythm3DBabylonConcertIndex = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const inputOffsetSec = useSelector((s: RootState) => s.preference.inputOffsetSec) ?? 0;
  const calibrationDone = useSelector((s: RootState) => s.preference.calibrationDone);
  const [audioEngine] = useState(() => new AudioEngine());
  const { chart, meta, status, error } = useChartLoader(parseTonejs);

  const [phase, setPhase] = useState<GamePhase>('idle');
  const phaseRef = useRef<GamePhase>('idle');
  const [score, setScore] = useState<ScoreState>(initialScore());
  const scoreRef = useRef<ScoreState>(initialScore());
  const [flash, setFlash] = useState<{ j: Judgement; k: number } | null>(null);
  const [sceneDebug, setSceneDebug] = useState<ConcertSceneDebug>(EMPTY_SCENE_DEBUG);

  const inputOffsetSecRef = useRef(inputOffsetSec);
  useEffect(() => {
    inputOffsetSecRef.current = inputOffsetSec;
  });
  const hitHandlerRef = useRef<((midi: number) => void) | null>(null);
  const litUntilRef = useRef<Map<number, number>>(new Map());

  const setPhaseSync = useCallback((p: GamePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const handleJudgement = useCallback((j: Judgement) => {
    const next = applyJudgement(scoreRef.current, j);
    scoreRef.current = next;
    setScore(next);
    setFlash({ j, k: Date.now() });
  }, []);
  const handleJudgementRef = useRef(handleJudgement);
  useEffect(() => {
    handleJudgementRef.current = handleJudgement;
  });

  const setSceneDebugRef = useRef(setSceneDebug);
  setSceneDebugRef.current = setSceneDebug;

  useEffect(() => {
    if (status !== 'ready') return;
    // Igual que drumRhythm3DBabylon: evitar `./assets/...` en Quattro.fs (Android).
    audioEngine.load('assets/song.ogg').catch(console.error);
    return () => {
      audioEngine.dispose();
    };
  }, [status, audioEngine]);

  useEffect(() => {
    if (phase !== 'playing') return;
    audioEngine.onEnded(() => setPhaseSync('result'));
  }, [phase, audioEngine, setPhaseSync]);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lane = KEY_LANE_MAP[e.key];
      if (lane !== undefined) triggerHit(DEV_LANE_MIDI[lane as number] ?? 38);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [triggerHit]);

  useEffect(() => {
    if (status !== 'ready' || !chart || !canvasRef.current) return;

    const canvas = canvasRef.current;

    let disposed = false;
    let fullDispose: (() => void) | undefined;

    void (async () => {
      const stage: ConcertStageHandles = await createConcertStageScene(canvas);
      if (disposed) {
        stage.dispose();
        return;
      }

      const { scene, engine, laneAnchors } = stage;

      const sceneInstrumentation = new SceneInstrumentation(scene);

      const highway = buildConcertHighway(scene, chart, stage.camera);
      const { pool, spawnBurst, padMatsMap, padLitColors } = highway;

      const drumReaction = new DrumKitHitReaction(laneAnchors);
      const hitVfx = new StylizedHitVfx(scene, {
        glowBlurKernel: CONCERT_PERF.glowBlurKernel,
        maxSparks: CONCERT_PERF.maxSparks,
      });

      const getAnchor = (lane: DrumLane) => laneAnchors.get(lane)!;
      const padDimColor = new Color3(0, 0, 0);

      hitHandlerRef.current = (midi: number) => {
        const lane = MIDI_TO_LANE[midi];
        if (lane === undefined) return;

        litUntilRef.current.set(lane as number, performance.now() + 160);
        spawnBurst(lane);
        drumReaction.trigger(lane);

        if (!audioEngine.isPlaying()) {
          hitVfx.triggerHit(getAnchor(lane), 'neutral');
          return;
        }

        const ct = audioEngine.getCurrentTime();
        let bestIdx = -1;
        let bestDelta = Infinity;
        for (let i = 0; i < pool.length; i++) {
          const n = pool[i];
          if (n.missed || n.lane !== lane) continue;
          const delta = ct - n.timeSec - inputOffsetSecRef.current;
          if (delta > WINDOWS_SEC.ok) continue;
          if (delta < -WINDOWS_SEC.ok) break;
          if (Math.abs(delta) < Math.abs(bestDelta)) {
            bestDelta = delta;
            bestIdx = i;
          }
        }

        if (bestIdx >= 0) {
          const row = pool[bestIdx];
          row.missed = true;
          row.instance.isVisible = false;
          const j = judge(bestDelta);
          hitVfx.triggerHit(getAnchor(lane), judgementToHitVfx(j));
          handleJudgementRef.current(j);
        } else {
          hitVfx.triggerHit(getAnchor(lane), 'neutral');
        }
      };

      let statsFrame = 0;
      const afterObs = scene.onAfterRenderObservable.add(() => {
        statsFrame++;
        if (statsFrame % 15 !== 0) return;
        const idx = scene.getActiveIndices();
        setSceneDebugRef.current({
          fps: Math.round(engine.getFps()),
          drawCalls: Math.round(sceneInstrumentation.drawCallsCounter.current),
          vertices: scene.getTotalVertices(),
          indices: idx,
          triangles: Math.floor(idx / 3),
          activeMeshes: scene.getActiveMeshes().length,
          meshes: scene.meshes.length,
          transformNodes: scene.transformNodes.length,
          lights: scene.lights.length,
          cameras: scene.cameras.length,
          materials: scene.materials.length,
          textures: scene.textures.length,
          particles: scene.getActiveParticles(),
          bones: scene.getActiveBones(),
        });
      });

      const obs = scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const ct = audioEngine.isPlaying() ? audioEngine.getCurrentTime() : -LOOK_AHEAD_SEC;

        for (const n of pool) {
          if (n.missed) {
            n.instance.isVisible = false;
            continue;
          }
          const ta = n.timeSec - ct;
          if (ct - n.timeSec > WINDOWS_SEC.ok) {
            n.missed = true;
            n.instance.isVisible = false;
            if (audioEngine.isPlaying()) handleJudgementRef.current('miss');
            continue;
          }
          if (ta > LOOK_AHEAD_SEC + 0.2 || ta < -0.15) {
            n.instance.isVisible = false;
            continue;
          }
          n.instance.isVisible = true;
          n.instance.position.z = 0 - ta * SPEED;
        }

        for (const [laneNum, mat] of padMatsMap.entries()) {
          const lit = (litUntilRef.current.get(laneNum) ?? 0) > now;
          mat.emissiveColor = lit ? padLitColors.get(laneNum)! : padDimColor;
        }

        drumReaction.tick();
      });

      engine.runRenderLoop(() => {
        scene.render();
      });

      const ro = new ResizeObserver(() => engine.resize());
      ro.observe(canvas);

      fullDispose = () => {
        scene.onAfterRenderObservable.remove(afterObs);
        sceneInstrumentation.dispose();
        setSceneDebugRef.current({ ...EMPTY_SCENE_DEBUG });
        scene.onBeforeRenderObservable.remove(obs);
        hitVfx.dispose();
        drumReaction.dispose();
        hitHandlerRef.current = null;
        ro.disconnect();
        stage.dispose();
        fullDispose = undefined;
      };
    })();

    return () => {
      disposed = true;
      hitHandlerRef.current = null;
      setSceneDebug({ ...EMPTY_SCENE_DEBUG });
      fullDispose?.();
    };
  }, [status, chart, audioEngine]);

  const handleCalibrate = useCallback(() => {
    navigate(`/${RouteMap.root.path}/${RouteMap.drumRhythmCalibration.path}`);
  }, [navigate]);

  return (
    <Box width="100%" height="100%" position="relative" overflow="hidden" bgcolor="#080812">
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {status === 'ready' && (
        <Box
          sx={{
            position: 'absolute',
            top: calibrationDone ? 8 : 60,
            left: 12,
            zIndex: 2,
            width: { xs: 'min(300px, calc(100vw - 120px))', sm: 308 },
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            borderRadius: '10px',
            background: 'linear-gradient(145deg, rgba(14, 18, 38, 0.92) 0%, rgba(8, 10, 24, 0.88) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(100, 140, 220, 0.28)',
            boxShadow:
              '0 0 0 1px rgba(0, 0, 0, 0.35) inset, 0 12px 40px rgba(0, 0, 0, 0.55), 0 0 48px rgba(60, 100, 200, 0.08)',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: 'linear-gradient(180deg, rgba(120, 190, 255, 0.95) 0%, rgba(80, 120, 220, 0.5) 50%, rgba(60, 90, 180, 0.35) 100%)',
              borderRadius: '10px 0 0 10px',
            },
          }}
        >
          <Box sx={{ pl: 2.25, pr: 1.5, pt: 1.1, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #9cf, #48a)',
                  boxShadow: '0 0 10px rgba(120, 200, 255, 0.75)',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(190, 215, 255, 0.98)',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                Rendimiento
              </Typography>
            </Box>
            <Box
              component="dl"
              sx={{
                m: 0,
                p: 0,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.74rem',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {(
                [
                  ['FPS', sceneDebug.fps],
                  ['Draw calls', sceneDebug.drawCalls],
                  ['Vértices', sceneDebug.vertices.toLocaleString()],
                  ['Índices', sceneDebug.indices.toLocaleString()],
                  ['Triángulos', sceneDebug.triangles.toLocaleString()],
                  ['Mallas activas', sceneDebug.activeMeshes],
                  ['Mallas en escena', sceneDebug.meshes],
                  ['Nodos transform', sceneDebug.transformNodes],
                  ['Luces', sceneDebug.lights],
                  ['Cámaras', sceneDebug.cameras],
                  ['Materiales', sceneDebug.materials],
                  ['Texturas', sceneDebug.textures],
                  ['Partículas', sceneDebug.particles],
                  ['Huesos activos', sceneDebug.bones],
                ] as const
              ).map(([label, value], i) => (
                <Box
                  key={label}
                  component="div"
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 2,
                    py: 0.5,
                    borderTop:
                      i === 0 ? 'none' : '1px solid rgba(120, 150, 220, 0.12)',
                    bgcolor: i % 2 === 1 ? 'rgba(255, 255, 255, 0.035)' : 'transparent',
                  }}
                >
                  <Typography
                    component="dt"
                    variant="body2"
                    sx={{
                      m: 0,
                      flex: '0 1 auto',
                      color: 'rgba(155, 175, 215, 0.92)',
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    component="dd"
                    variant="body2"
                    sx={{
                      m: 0,
                      flex: '0 0 auto',
                      color: 'rgba(235, 242, 255, 0.98)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      textAlign: 'right',
                      textShadow: '0 0 20px rgba(100, 160, 255, 0.15)',
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
      {status === 'loading' && (
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0 }}>
          <Box color="white">Loading chart…</Box>
        </Box>
      )}
      {status === 'error' && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={1}
          sx={{ position: 'absolute', inset: 0, p: 2 }}
        >
          <Box color="#f87171" fontWeight="bold">Failed to load chart (Babylon.js)</Box>
          <Box color="#fca5a5" fontSize="0.75rem" textAlign="center" sx={{ wordBreak: 'break-all' }}>
            {error}
          </Box>
        </Box>
      )}
      {status === 'ready' && (
        <ScoreHud
          score={score}
          phase={phase}
          meta={meta as ChartMeta | null}
          calibrationDone={calibrationDone}
          inputOffsetSec={inputOffsetSec}
          onCalibrate={handleCalibrate}
          judgementFlash={flash}
        />
      )}
    </Box>
  );
};
