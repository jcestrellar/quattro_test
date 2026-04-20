import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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

// ── Layout ───────────────────────────────────────────────────────────────────
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

type GamePhase = 'idle' | 'playing' | 'result';

interface Active3DNote extends MidiNote {
  id: number;
  lane: DrumLane;
  laneIdx: number;
  missed: boolean;
  mesh: THREE.Mesh;
}

let seq3D = 0;

export const DrumRhythm3DIndex = () => {
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

  // Refs so the game-loop closure always reads fresh values without scene rebuild
  const inputOffsetSecRef = useRef(inputOffsetSec);
  useEffect(() => { inputOffsetSecRef.current = inputOffsetSec; });
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
  useEffect(() => { handleJudgementRef.current = handleJudgement; });

  useEffect(() => {
    if (status !== 'ready') return;
    audioEngine.load('assets/song.ogg').catch(console.error);
    return () => { audioEngine.dispose(); };
  }, [status, audioEngine]);

  useEffect(() => {
    if (phase !== 'playing') return;
    audioEngine.onEnded(() => setPhaseSync('result'));
  }, [phase, audioEngine, setPhaseSync]);

  const triggerHit = useCallback(async (midi: number) => {
    if (phaseRef.current === 'result') return;
    if (phaseRef.current === 'idle') {
      await audioEngine.resume();
      audioEngine.start();
      setPhaseSync('playing');
    }
    hitHandlerRef.current?.(midi);
  }, [audioEngine, setPhaseSync]);

  useMidiNoteOn((note) => { if (MIDI_TO_LANE[note] !== undefined) triggerHit(note); });

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

  // ── Three.js scene (built once when chart is ready) ────────────────────────
  useEffect(() => {
    if (status !== 'ready' || !chart || !canvasRef.current) return;
    const canvas = canvasRef.current;

    // Renderer — pass canvas directly so Three.js doesn't create its own element
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const initW = canvas.clientWidth || window.innerWidth;
    const initH = canvas.clientHeight || window.innerHeight;
    renderer.setSize(initW, initH, false); // false = keep CSS width/height intact
    renderer.setClearColor(0x080812);
    renderer.shadowMap.enabled = true;

    // Scene + fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x080812, HIGHWAY_DEPTH * 0.45, HIGHWAY_DEPTH * 1.05);

    // Camera
    const camera = new THREE.PerspectiveCamera(58, initW / initH, 0.1, 100);
    camera.position.set(0, 3.5, 7);
    camera.lookAt(0, 0, -5);

    // Lights
    scene.add(new THREE.AmbientLight(0x223366, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 3.5);
    sun.position.set(2, 8, 5);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x4466ff, 1.0);
    fill.position.set(0, 4, -20);
    scene.add(fill);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HIGHWAY_W, HIGHWAY_DEPTH + 2),
      new THREE.MeshStandardMaterial({ color: 0x0b0f26, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -HIGHWAY_DEPTH / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Side walls (give depth + border feel)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d1240, roughness: 0.7, metalness: 0.4 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.2, HIGHWAY_DEPTH + 2), wallMat);
      wall.position.set(side * (HIGHWAY_W / 2 + 0.035), 0.55, -HIGHWAY_DEPTH / 2);
      scene.add(wall);
    }

    // Lane dividers
    const divMat = new THREE.LineBasicMaterial({ color: 0x1a2a66 });
    for (let i = 0; i <= LANE_COUNT; i++) {
      const x = -HIGHWAY_W / 2 + i * (LANE_W + LANE_GAP) + (i === 0 ? LANE_GAP / 2 : -LANE_GAP / 2);
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.01, HIT_Z + 0.5),
        new THREE.Vector3(x, 0.01, -HIGHWAY_DEPTH),
      ]);
      scene.add(new THREE.Line(geo, divMat));
    }

    // Hit line (glow + core)
    const hitGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(HIGHWAY_W, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide }),
    );
    hitGlow.rotation.x = -Math.PI / 2;
    hitGlow.position.set(0, 0.012, HIT_Z);
    scene.add(hitGlow);
    const hitLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-HIGHWAY_W / 2, 0.015, HIT_Z),
      new THREE.Vector3(HIGHWAY_W / 2, 0.015, HIT_Z),
    ]);
    scene.add(new THREE.Line(hitLineGeo, new THREE.LineBasicMaterial({ color: 0xffffff })));

    // ── Ambient floating dust ─────────────────────────────────────────────────
    const AMBIENT_COUNT = 320;
    const ambientPos = new Float32Array(AMBIENT_COUNT * 3);
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      ambientPos[i * 3 + 0] = (Math.random() - 0.5) * HIGHWAY_W * 1.1;
      ambientPos[i * 3 + 1] = Math.random() * 4.5;
      ambientPos[i * 3 + 2] = HIT_Z + 1 - Math.random() * (HIGHWAY_DEPTH + 2);
    }
    const ambientGeo = new THREE.BufferGeometry();
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));
    const ambientMat = new THREE.PointsMaterial({
      color: 0x5577ff, size: 0.055, transparent: true, opacity: 0.28, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(ambientGeo, ambientMat));

    // ── Hit burst pool ────────────────────────────────────────────────────────
    interface BurstEntry {
      points: THREE.Points;
      geo: THREE.BufferGeometry;
      mat: THREE.PointsMaterial;
      vel: Float32Array;
      born: number;
    }
    const BURST_COUNT = 26;
    const BURST_MS = 540;
    const activeBursts: BurstEntry[] = [];

    const spawnBurst = (lane: DrumLane, x: number, y: number) => {
      const bGeo = new THREE.BufferGeometry();
      const bPos = new Float32Array(BURST_COUNT * 3);
      const bVel = new Float32Array(BURST_COUNT * 3);
      for (let i = 0; i < BURST_COUNT; i++) {
        bPos[i * 3 + 0] = x;
        bPos[i * 3 + 1] = y;
        bPos[i * 3 + 2] = HIT_Z;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.03 + Math.random() * 0.055;
        bVel[i * 3 + 0] = Math.cos(angle) * speed;
        bVel[i * 3 + 1] = 0.04 + Math.random() * 0.07;
        bVel[i * 3 + 2] = (Math.random() - 0.5) * 0.025;
      }
      bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
      const bMat = new THREE.PointsMaterial({
        color: LANE_COLORS[lane], size: 0.16, transparent: true, opacity: 1.0, sizeAttenuation: true,
      });
      const bPoints = new THREE.Points(bGeo, bMat);
      scene.add(bPoints);
      activeBursts.push({ points: bPoints, geo: bGeo, mat: bMat, vel: bVel, born: performance.now() });
    };

    // Pad indicators + per-pad materials (mutable for flash)
    const padMatsMap = new Map<number, THREE.MeshStandardMaterial>();
    LANE_ORDER.forEach((lane, idx) => {
      const c = new THREE.Color(LANE_COLORS[lane]);
      const mat = new THREE.MeshStandardMaterial({
        color: c.clone().multiplyScalar(0.2),
        emissive: c, emissiveIntensity: 0.1,
        roughness: 0.5, metalness: 0.5,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(LANE_W - 0.08, 0.14, 0.55), mat);
      mesh.position.set(laneX(idx), 0.07, HIT_Z + 0.05);
      scene.add(mesh);
      padMatsMap.set(lane as number, mat);
    });
    const kickC = new THREE.Color(LANE_COLORS[DrumLane.Kick]);
    const kickPadMat = new THREE.MeshStandardMaterial({
      color: kickC.clone().multiplyScalar(0.2),
      emissive: kickC, emissiveIntensity: 0.1,
      roughness: 0.5, metalness: 0.5,
    });
    const kickPadMesh = new THREE.Mesh(new THREE.BoxGeometry(HIGHWAY_W - 0.12, 0.09, 0.44), kickPadMat);
    kickPadMesh.position.set(0, 0.045, HIT_Z + 0.08);
    scene.add(kickPadMesh);
    padMatsMap.set(DrumLane.Kick as number, kickPadMat);

    // Shared note geometries, per-lane materials
    const noteGeo = new THREE.BoxGeometry(LANE_W - 0.06, 0.2, 0.55);
    const kickNoteGeo = new THREE.BoxGeometry(HIGHWAY_W - 0.14, 0.12, 0.44);
    const noteMats: Partial<Record<DrumLane, THREE.MeshStandardMaterial>> = {};
    for (const lane of [...LANE_ORDER, DrumLane.Kick] as DrumLane[]) {
      const c = new THREE.Color(LANE_COLORS[lane]);
      noteMats[lane] = new THREE.MeshStandardMaterial({
        color: c.clone().multiplyScalar(0.75),
        emissive: c, emissiveIntensity: 0.6,
        roughness: 0.25, metalness: 0.7,
      });
    }

    // Note pool — all meshes created upfront, shown/hidden by timing window
    const pool: Active3DNote[] = chart.notes
      .filter(n => MIDI_TO_LANE[n.midi] !== undefined)
      .map(n => {
        const lane = MIDI_TO_LANE[n.midi];
        const isKick = lane === DrumLane.Kick;
        const laneIdx = isKick ? -1 : LANE_ORDER.indexOf(lane as typeof LANE_ORDER[number]);
        const mesh = new THREE.Mesh(isKick ? kickNoteGeo : noteGeo, noteMats[lane]!);
        mesh.castShadow = true;
        mesh.visible = false;
        mesh.position.set(isKick ? 0 : laneX(laneIdx), isKick ? 0.045 : 0.1, -HIGHWAY_DEPTH);
        scene.add(mesh);
        return { ...n, id: seq3D++, lane, laneIdx, missed: false, mesh };
      });

    // Hit handler — reads refs so always gets fresh inputOffsetSec
    hitHandlerRef.current = (midi: number) => {
      const lane = MIDI_TO_LANE[midi];
      if (lane === undefined) return;
      const isKick = lane === DrumLane.Kick;
      const laneIdx = isKick ? -1 : LANE_ORDER.indexOf(lane as typeof LANE_ORDER[number]);
      litUntilRef.current.set(lane as number, performance.now() + 140);
      // Burst at pad position regardless of whether a note was hit
      spawnBurst(lane, isKick ? 0 : laneX(laneIdx), isKick ? 0.045 : 0.1);
      if (!audioEngine.isPlaying()) return;
      const ct = audioEngine.getCurrentTime();
      let bestIdx = -1, bestDelta = Infinity;
      for (let i = 0; i < pool.length; i++) {
        const n = pool[i];
        if (n.missed || n.lane !== lane) continue;
        const delta = ct - n.timeSec - inputOffsetSecRef.current;
        if (delta > WINDOWS_SEC.ok) continue;
        if (delta < -WINDOWS_SEC.ok) break;
        if (Math.abs(delta) < Math.abs(bestDelta)) { bestDelta = delta; bestIdx = i; }
      }
      if (bestIdx >= 0) {
        pool[bestIdx].missed = true;
        pool[bestIdx].mesh.visible = false;
        handleJudgementRef.current(judge(bestDelta));
      }
    };

    // Resize
    const ro = new ResizeObserver(() => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (W === 0 || H === 0) return;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    // Render loop
    let rafId: number;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const now = performance.now();
      const ct = audioEngine.isPlaying() ? audioEngine.getCurrentTime() : -LOOK_AHEAD_SEC;

      for (const n of pool) {
        if (n.missed) { n.mesh.visible = false; continue; }
        const ta = n.timeSec - ct;
        if (ct - n.timeSec > WINDOWS_SEC.ok) {
          n.missed = true;
          n.mesh.visible = false;
          if (audioEngine.isPlaying()) handleJudgementRef.current('miss');
          continue;
        }
        if (ta > LOOK_AHEAD_SEC + 0.2 || ta < -0.15) { n.mesh.visible = false; continue; }
        n.mesh.visible = true;
        n.mesh.position.z = HIT_Z - ta * SPEED;
      }

      for (const [laneNum, mat] of padMatsMap.entries()) {
        mat.emissiveIntensity = (litUntilRef.current.get(laneNum) ?? 0) > now ? 1.0 : 0.1;
      }

      // Animate ambient dust
      const aAttr = ambientGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < AMBIENT_COUNT; i++) {
        const ay = aAttr.getY(i) + 0.005;
        const az = aAttr.getZ(i) + 0.009;
        aAttr.setY(i, ay > 5.0 ? 0 : ay);
        aAttr.setZ(i, az > HIT_Z + 1.2 ? HIT_Z + 1.2 - HIGHWAY_DEPTH - Math.random() * 2 : az);
      }
      aAttr.needsUpdate = true;

      // Animate hit bursts
      for (let b = activeBursts.length - 1; b >= 0; b--) {
        const burst = activeBursts[b];
        const t = (now - burst.born) / BURST_MS;
        if (t >= 1) {
          scene.remove(burst.points);
          burst.geo.dispose();
          burst.mat.dispose();
          activeBursts.splice(b, 1);
          continue;
        }
        burst.mat.opacity = (1 - t) * (1 - t);
        const pAttr = burst.geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < BURST_COUNT; i++) {
          pAttr.setXYZ(
            i,
            pAttr.getX(i) + burst.vel[i * 3 + 0],
            pAttr.getY(i) + burst.vel[i * 3 + 1],
            pAttr.getZ(i) + burst.vel[i * 3 + 2],
          );
          burst.vel[i * 3 + 1] -= 0.0022; // gravity
        }
        pAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      hitHandlerRef.current = null;
      ambientGeo.dispose();
      ambientMat.dispose();
      for (const burst of activeBursts) {
        scene.remove(burst.points);
        burst.geo.dispose();
        burst.mat.dispose();
      }
      activeBursts.length = 0;
      const disposedGeos = new Set<THREE.BufferGeometry>();
      const disposedMats = new Set<THREE.Material>();
      scene.traverse((obj: THREE.Object3D) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (!disposedGeos.has(obj.geometry)) { obj.geometry.dispose(); disposedGeos.add(obj.geometry); }
        const mats: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: THREE.Material) => { if (!disposedMats.has(m)) { m.dispose(); disposedMats.add(m); } });
      });
      renderer.dispose();
    };
  }, [status, chart, audioEngine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCalibrate = useCallback(() => {
    navigate(`/${RouteMap.root.path}/${RouteMap.drumRhythmCalibration.path}`);
  }, [navigate]);

  return (
    <Box width="100%" height="100%" position="relative" overflow="hidden" bgcolor="#080812">
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }} />
      {status === 'loading' && (
        <Box display="flex" alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0 }}>
          <Box color="white">Loading chart…</Box>
        </Box>
      )}
      {status === 'error' && (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" gap={1} sx={{ position: 'absolute', inset: 0, p: 2 }}>
          <Box color="#f87171" fontWeight="bold">Failed to load chart (Three.js)</Box>
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
