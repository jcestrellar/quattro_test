import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  Engine,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  ParticleSystem,
  Scene,
  StandardMaterial,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from '@babylonjs/core';
import { Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import type { RootState } from '../../stores/store';
import { useMidiNoteOn } from '../calibration/useMidiNoteOn';
import { useChartLoader } from '../drumRhythm/useChartLoader';
import { parseTonejs } from '../drumRhythm/midiParser/parseTonejs';
import { AudioEngine } from '../drumRhythm/audioEngine';
import { DrumLane, KEY_LANE_MAP, LANE_COLORS, LANE_ORDER, MIDI_TO_LANE } from '../drumRhythm/drumPadMap';
import { applyJudgement, initialScore, judge, WINDOWS_SEC } from '../drumRhythm/scoring';
import type { Judgement, ScoreState } from '../drumRhythm/scoring';
import { ScoreHud } from '../drumRhythm/components/scoreHud';
import type { ChartMeta, MidiNote } from '../drumRhythm/chartTypes';
import { RouteMap } from '../../routes';

const LOOK_AHEAD_SEC = 2.5;
const HIGHWAY_DEPTH = 24;
const SPEED = HIGHWAY_DEPTH / LOOK_AHEAD_SEC;
const HIT_Z = 0;
const LANE_W = 1.55;
const LANE_GAP = 0.12;
const LANE_COUNT = LANE_ORDER.length;
const HIGHWAY_W = LANE_COUNT * LANE_W + (LANE_COUNT + 1) * LANE_GAP;

function laneX(idx: number): number {
  return -HIGHWAY_W / 2 + LANE_GAP + LANE_W / 2 + idx * (LANE_W + LANE_GAP);
}

function laneXBab(idx: number): number {
  return -laneX(idx);
}

function hexToColor3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
}

type GamePhase = 'idle' | 'playing' | 'result';

interface Active3DNote extends MidiNote {
  id: number;
  lane: DrumLane;
  laneIdx: number;
  missed: boolean;
  instance: InstancedMesh;
}

let seqBab = 0;

export const DrumRhythm3DBabylonIndex = () => {
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

  useEffect(() => {
    if (status !== 'ready') return;
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
    const LANE_MIDI: Record<number, number> = { [-1]: 36, 0: 38, 1: 42, 2: 48, 3: 49 };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const lane = KEY_LANE_MAP[e.key];
      if (lane !== undefined) triggerHit(LANE_MIDI[lane as number] ?? 38);
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [triggerHit]);

  useEffect(() => {
    if (status !== 'ready' || !chart || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.03, 0.03, 0.08, 1);
    scene.fogMode = Scene.FOGMODE_LINEAR;
    scene.fogStart = HIGHWAY_DEPTH * 0.45;
    scene.fogEnd = HIGHWAY_DEPTH * 1.05;
    scene.fogColor = new Color3(0.03, 0.03, 0.08);

    const camera = new FreeCamera('cam', new Vector3(0, 3.5, 7), scene);
    camera.setTarget(new Vector3(0, 0, -5));
    camera.minZ = 0.1;
    camera.maxZ = 100;

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
    hemi.intensity = 0.7;
    hemi.diffuse = new Color3(0.2, 0.3, 0.8);
    hemi.groundColor = new Color3(0.05, 0.05, 0.15);
    const sun = new DirectionalLight('sun', new Vector3(-1, -3, -2), scene);
    sun.intensity = 2.8;

    const floor = MeshBuilder.CreateGround('floor', { width: HIGHWAY_W, height: HIGHWAY_DEPTH + 2 }, scene);
    floor.position.z = -HIGHWAY_DEPTH / 2;
    const floorMat = new StandardMaterial('floorMat', scene);
    floorMat.diffuseColor = new Color3(0.05, 0.07, 0.16);
    floorMat.specularColor = Color3.Black();
    floor.material = floorMat;

    for (const side of [-1, 1]) {
      const wall = MeshBuilder.CreateBox(`wall-${side}`, { width: 0.07, height: 1.2, depth: HIGHWAY_DEPTH + 2 }, scene);
      wall.position = new Vector3(side * (HIGHWAY_W / 2 + 0.035), 0.55, -HIGHWAY_DEPTH / 2);
      const wMat = new StandardMaterial(`wallMat-${side}`, scene);
      wMat.diffuseColor = new Color3(0.05, 0.07, 0.2);
      wMat.emissiveColor = new Color3(0.02, 0.03, 0.12);
      wall.material = wMat;
    }

    for (let i = 0; i <= LANE_COUNT; i++) {
      const x = HIGHWAY_W / 2 - i * (LANE_W + LANE_GAP) + (i === 0 ? -LANE_GAP / 2 : LANE_GAP / 2);
      MeshBuilder.CreateLines(
        `div-${i}`,
        {
          points: [new Vector3(x, 0.01, HIT_Z + 0.5), new Vector3(x, 0.01, -HIGHWAY_DEPTH)],
          colors: [new Color4(0.12, 0.18, 0.7, 1), new Color4(0.05, 0.08, 0.3, 0)],
        },
        scene,
      );
    }

    MeshBuilder.CreateLines(
      'hitline',
      {
        points: [new Vector3(-HIGHWAY_W / 2, 0.015, HIT_Z), new Vector3(HIGHWAY_W / 2, 0.015, HIT_Z)],
        colors: [new Color4(1, 1, 1, 1), new Color4(1, 1, 1, 1)],
      },
      scene,
    );
    const hitGlowMesh = MeshBuilder.CreatePlane('hitGlow', { width: HIGHWAY_W, height: 0.55 }, scene);
    hitGlowMesh.rotation.x = Math.PI / 2;
    hitGlowMesh.position = new Vector3(0, 0.012, HIT_Z);
    const hitGlowMat = new StandardMaterial('hitGlowMat', scene);
    hitGlowMat.emissiveColor = new Color3(0.3, 0.3, 0.3);
    hitGlowMat.alpha = 0.06;
    hitGlowMesh.material = hitGlowMat;

    const ptex = new DynamicTexture('particleTex', { width: 16, height: 16 }, scene, false);
    const pctx = ptex.getContext();
    pctx.fillStyle = 'white';
    pctx.beginPath();
    pctx.arc(8, 8, 7, 0, Math.PI * 2);
    pctx.fill();
    ptex.update();

    const ambient = new ParticleSystem('ambient', 400, scene);
    ambient.particleTexture = ptex;
    ambient.emitter = new Vector3(0, 0, -HIGHWAY_DEPTH / 2);
    ambient.minEmitBox = new Vector3(-HIGHWAY_W / 2, 0, -HIGHWAY_DEPTH / 2);
    ambient.maxEmitBox = new Vector3(HIGHWAY_W / 2, 4.5, HIGHWAY_DEPTH / 2);
    ambient.color1 = new Color4(0.3, 0.5, 1, 0.35);
    ambient.color2 = new Color4(0.4, 0.4, 1, 0.22);
    ambient.colorDead = new Color4(0.2, 0.3, 0.8, 0);
    ambient.minSize = 0.04;
    ambient.maxSize = 0.09;
    ambient.minLifeTime = 5;
    ambient.maxLifeTime = 9;
    ambient.emitRate = 45;
    ambient.minEmitPower = 0.02;
    ambient.maxEmitPower = 0.05;
    ambient.direction1 = new Vector3(-0.1, 0.6, 0.1);
    ambient.direction2 = new Vector3(0.1, 1, 0.12);
    ambient.gravity = new Vector3(0, 0, 0.09);
    ambient.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ambient.start();

    const BURST_COUNT = 26;
    const spawnBurst = (x: number, y: number, lane: DrumLane) => {
      const c = hexToColor3(LANE_COLORS[lane]);
      const burst = new ParticleSystem(`burst-${seqBab++}`, BURST_COUNT, scene);
      burst.particleTexture = ptex;
      burst.emitter = new Vector3(x, y, HIT_Z);
      burst.minEmitBox = new Vector3(-0.12, -0.04, -0.04);
      burst.maxEmitBox = new Vector3(0.12, 0.04, 0.04);
      burst.color1 = new Color4(c.r, c.g, c.b, 1);
      burst.color2 = new Color4(c.r * 0.8, c.g * 0.8, c.b * 0.8, 0.9);
      burst.colorDead = new Color4(c.r, c.g, c.b, 0);
      burst.minSize = 0.1;
      burst.maxSize = 0.22;
      burst.minLifeTime = 0.28;
      burst.maxLifeTime = 0.58;
      burst.emitRate = 0;
      burst.manualEmitCount = BURST_COUNT;
      burst.minEmitPower = 2.5;
      burst.maxEmitPower = 5.5;
      burst.direction1 = new Vector3(-1.2, 1.5, -0.5);
      burst.direction2 = new Vector3(1.2, 4, 0.5);
      burst.gravity = new Vector3(0, -9, 0);
      burst.blendMode = ParticleSystem.BLENDMODE_STANDARD;
      burst.targetStopDuration = 0.08;
      burst.disposeOnStop = true;
      burst.start();
    };

    const padMatsMap = new Map<number, StandardMaterial>();
    const padLitColors = new Map<number, Color3>();
    const padDimColor = new Color3(0, 0, 0);

    LANE_ORDER.forEach((lane, idx) => {
      const c = hexToColor3(LANE_COLORS[lane]);
      const mat = new StandardMaterial(`padMat-${lane}`, scene);
      mat.diffuseColor = c.scale(0.2);
      mat.emissiveColor = padDimColor;
      mat.specularColor = c.scale(0.4);
      const pad = MeshBuilder.CreateBox(`pad-${lane}`, { width: LANE_W - 0.08, height: 0.14, depth: 0.55 }, scene);
      pad.position = new Vector3(laneXBab(idx), 0.07, HIT_Z + 0.05);
      pad.material = mat;
      padMatsMap.set(lane as number, mat);
      padLitColors.set(lane as number, c.scale(0.85));
    });
    const kickC = hexToColor3(LANE_COLORS[DrumLane.Kick]);
    const kickPadMat = new StandardMaterial('kickPadMat', scene);
    kickPadMat.diffuseColor = kickC.scale(0.2);
    kickPadMat.emissiveColor = padDimColor;
    kickPadMat.specularColor = kickC.scale(0.4);
    const kickPad = MeshBuilder.CreateBox('kickPad', { width: HIGHWAY_W - 0.12, height: 0.09, depth: 0.44 }, scene);
    kickPad.position = new Vector3(0, 0.045, HIT_Z + 0.08);
    kickPad.material = kickPadMat;
    padMatsMap.set(DrumLane.Kick as number, kickPadMat);
    padLitColors.set(DrumLane.Kick as number, kickC.scale(0.85));

    const noteTemplates = new Map<DrumLane, Mesh>();
    for (const lane of [...LANE_ORDER, DrumLane.Kick] as DrumLane[]) {
      const isKick = lane === DrumLane.Kick;
      const tmpl = MeshBuilder.CreateBox(`tmpl-${lane}`, {
        width: isKick ? HIGHWAY_W - 0.14 : LANE_W - 0.06,
        height: isKick ? 0.12 : 0.2,
        depth: isKick ? 0.44 : 0.55,
      }, scene);
      tmpl.isVisible = false;
      const c = hexToColor3(LANE_COLORS[lane]);
      const mat = new StandardMaterial(`noteMat-${lane}`, scene);
      mat.diffuseColor = c.scale(0.7);
      mat.emissiveColor = c.scale(0.5);
      mat.specularColor = c;
      tmpl.material = mat;
      noteTemplates.set(lane, tmpl);
    }

    const pool: Active3DNote[] = chart.notes
      .filter((n) => MIDI_TO_LANE[n.midi] !== undefined)
      .map((n) => {
        const lane = MIDI_TO_LANE[n.midi];
        const isKick = lane === DrumLane.Kick;
        const laneIdx = isKick ? -1 : LANE_ORDER.indexOf(lane as (typeof LANE_ORDER)[number]);
        const instance = noteTemplates.get(lane)!.createInstance(`note-${seqBab++}`);
        instance.position = new Vector3(isKick ? 0 : laneXBab(laneIdx), isKick ? 0.045 : 0.1, -HIGHWAY_DEPTH);
        instance.isVisible = false;
        return { ...n, id: seqBab, lane, laneIdx, missed: false, instance };
      });

    hitHandlerRef.current = (midi: number) => {
      const lane = MIDI_TO_LANE[midi];
      if (lane === undefined) return;
      const isKick = lane === DrumLane.Kick;
      const laneIdx = isKick ? -1 : LANE_ORDER.indexOf(lane as (typeof LANE_ORDER)[number]);
      litUntilRef.current.set(lane as number, performance.now() + 140);
      spawnBurst(isKick ? 0 : laneXBab(laneIdx), isKick ? 0.045 : 0.1, lane);
      if (!audioEngine.isPlaying()) return;
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
        pool[bestIdx].missed = true;
        pool[bestIdx].instance.isVisible = false;
        handleJudgementRef.current(judge(bestDelta));
      }
    };

    scene.registerBeforeRender(() => {
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
        n.instance.position.z = HIT_Z - ta * SPEED;
      }

      for (const [laneNum, mat] of padMatsMap.entries()) {
        const lit = (litUntilRef.current.get(laneNum) ?? 0) > now;
        mat.emissiveColor = lit ? padLitColors.get(laneNum)! : padDimColor;
      }
    });

    engine.runRenderLoop(() => scene.render());

    const ro = new ResizeObserver(() => engine.resize());
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      hitHandlerRef.current = null;
      engine.dispose();
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
      {status === 'loading' && (
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0 }}>
          <Box color="white">Loading chart…</Box>
        </Box>
      )}
      {status === 'error' && (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1} sx={{ position: 'absolute', inset: 0, p: 2 }}>
          <Box color="#f87171" fontWeight="bold">Failed to load chart (Babylon.js)</Box>
          <Box color="#fca5a5" fontSize="0.75rem" textAlign="center" sx={{ wordBreak: 'break-all' }}>{error}</Box>
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
