import {
  Color3,
  Color4,
  DynamicTexture,
  FreeCamera,
  Matrix,
  MeshBuilder,
  ParticleSystem,
  Quaternion,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  type InstancedMesh,
  type Mesh,
} from '@babylonjs/core';
import type { MidiChart, MidiNote } from '../../drumRhythm/chartTypes';
import { DrumLane, LANE_COLORS, LANE_ORDER, MIDI_TO_LANE } from '../../drumRhythm/drumPadMap';

/** Misma lógica temporal que el modo carretera clásico. */
export const LOOK_AHEAD_SEC = 2.5;
export const HIGHWAY_DEPTH = 20;
export const SPEED = HIGHWAY_DEPTH / LOOK_AHEAD_SEC;
export const HIT_Z = 0;
const LANE_W = 1.45;
const LANE_GAP = 0.1;
const LANE_COUNT = LANE_ORDER.length;
const HIGHWAY_W = LANE_COUNT * LANE_W + (LANE_COUNT + 1) * LANE_GAP;

export interface ActiveConcertNote extends MidiNote {
  lane: DrumLane;
  laneIdx: number;
  missed: boolean;
  instance: InstancedMesh;
}

function laneX(idx: number): number {
  return -HIGHWAY_W / 2 + LANE_GAP + LANE_W / 2 + idx * (LANE_W + LANE_GAP);
}

function laneXBab(idx: number): number {
  return -laneX(idx);
}

function hexToColor3(hex: number): Color3 {
  return new Color3(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255);
}

export interface ConcertHighwayHandles {
  highwayRoot: TransformNode;
  pool: ActiveConcertNote[];
  spawnBurst: (lane: DrumLane) => void;
  padMatsMap: Map<number, StandardMaterial>;
  padLitColors: Map<number, Color3>;
}

/** Presets de partículas del highway (móvil vs escritorio). */
export interface ConcertHighwayParticleTuning {
  ambientMax: number;
  ambientEmitRate: number;
  burstCount: number;
}

const DEFAULT_HIGHWAY_PARTICLES: ConcertHighwayParticleTuning = {
  ambientMax: 220,
  ambientEmitRate: 28,
  burstCount: 22,
};

let seq = 0;

/** Distancia desde la cámara hasta la línea de golpeo (a lo largo del rayo de visión). */
const HIT_LINE_DISTANCE_FROM_CAMERA = 4.1;
/** Centro aproximado del kit (hacia donde mira la cámara del concierto). */
const STAGE_LOOK_AT = new Vector3(0, 1.05, 0);

/**
 * Inclinación estilo Guitar Hero / Rock Band: el carril no queda vertical al plano de la cámara,
 * así se percibe profundidad (las notas “suben” desde el fondo hacia la línea de golpeo).
 */
const HIGHWAY_VIEW_TILT_RAD = 0.44;

/**
 * Coloca el highway de forma que el eje local +Z apunte hacia la cámara:
 * las notas avanzan de z negativo → 0, es decir hacia el jugador en primera persona.
 */
function alignHighwayRootToCamera(root: TransformNode, camera: FreeCamera): void {
  const camPos = camera.globalPosition.clone();
  const intoScene = STAGE_LOOK_AT.subtract(camPos);
  if (intoScene.lengthSquared() < 1e-6) {
    intoScene.set(0, 0, 1);
  }
  intoScene.normalize();

  const hitPos = camPos.add(intoScene.scale(HIT_LINE_DISTANCE_FROM_CAMERA));
  root.position.copyFrom(hitPos);

  const towardCamera = camPos.subtract(hitPos);
  if (towardCamera.lengthSquared() < 1e-6) {
    towardCamera.set(0, 0, -1);
  }
  towardCamera.normalize();

  const zAxis = towardCamera;
  let xAxis = Vector3.Cross(Vector3.Up(), zAxis);
  if (xAxis.lengthSquared() < 1e-5) {
    xAxis = Vector3.Cross(new Vector3(1, 0, 0), zAxis);
  }
  xAxis.normalize();
  const yAxis = Vector3.Cross(zAxis, xAxis).normalize();

  const rm = new Matrix();
  rm.copyFromFloats(
    xAxis.x,
    xAxis.y,
    xAxis.z,
    0,
    yAxis.x,
    yAxis.y,
    yAxis.z,
    0,
    zAxis.x,
    zAxis.y,
    zAxis.z,
    0,
    0,
    0,
    0,
    1,
  );

  const facingCam = Quaternion.FromRotationMatrix(rm);
  const tilt = Quaternion.RotationAxis(new Vector3(1, 0, 0), HIGHWAY_VIEW_TILT_RAD);
  root.rotationQuaternion = facingCam.multiply(tilt);
  root.scaling = new Vector3(0.44, 0.44, 0.44);
}

/**
 * Carretera GH/RB: orientada frente a la cámara (notas vienen hacia el jugador).
 */
export function buildConcertHighway(
  scene: Scene,
  chart: MidiChart,
  camera: FreeCamera,
  particles: ConcertHighwayParticleTuning = DEFAULT_HIGHWAY_PARTICLES,
): ConcertHighwayHandles {
  const root = new TransformNode('ghHighway', scene);
  alignHighwayRootToCamera(root, camera);

  const floor = MeshBuilder.CreateGround('ghFloor', { width: HIGHWAY_W, height: HIGHWAY_DEPTH + 2 }, scene);
  floor.parent = root;
  floor.position.z = -HIGHWAY_DEPTH / 2;
  const floorMat = new StandardMaterial('ghFloorMat', scene);
  floorMat.diffuseColor = new Color3(0.04, 0.06, 0.14);
  floorMat.specularColor = Color3.Black();
  floorMat.alpha = 0.42;
  floorMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  floor.material = floorMat;
  floor.renderingGroupId = 1;

  for (const side of [-1, 1]) {
    const wall = MeshBuilder.CreateBox(`ghWall-${side}`, { width: 0.06, height: 1.05, depth: HIGHWAY_DEPTH + 2 }, scene);
    wall.parent = root;
    wall.position = new Vector3(side * (HIGHWAY_W / 2 + 0.03), 0.48, -HIGHWAY_DEPTH / 2);
    const wMat = new StandardMaterial(`ghWallMat-${side}`, scene);
    wMat.diffuseColor = new Color3(0.06, 0.08, 0.18);
    wMat.emissiveColor = new Color3(0.03, 0.04, 0.12);
    wMat.alpha = 0.55;
    wMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
    wall.material = wMat;
    wall.renderingGroupId = 1;
  }

  for (let i = 0; i <= LANE_COUNT; i++) {
    const x = HIGHWAY_W / 2 - i * (LANE_W + LANE_GAP) + (i === 0 ? -LANE_GAP / 2 : LANE_GAP / 2);
    const lines = MeshBuilder.CreateLines(
      `ghDiv-${i}`,
      {
        points: [new Vector3(x, 0.01, HIT_Z + 0.45), new Vector3(x, 0.01, -HIGHWAY_DEPTH)],
        colors: [new Color4(0.2, 0.35, 0.85, 0.9), new Color4(0.08, 0.1, 0.35, 0.15)],
      },
      scene,
    );
    lines.parent = root;
    lines.renderingGroupId = 1;
  }

  const hitLine = MeshBuilder.CreateLines(
    'ghHitLine',
    {
      points: [new Vector3(-HIGHWAY_W / 2, 0.018, HIT_Z), new Vector3(HIGHWAY_W / 2, 0.018, HIT_Z)],
      colors: [new Color4(1, 1, 1, 1), new Color4(0.85, 0.9, 1, 1)],
    },
    scene,
  );
  hitLine.parent = root;
  hitLine.renderingGroupId = 1;

  const hitGlowMesh = MeshBuilder.CreatePlane('ghHitGlow', { width: HIGHWAY_W, height: 0.5 }, scene);
  hitGlowMesh.parent = root;
  hitGlowMesh.rotation.x = Math.PI / 2;
  hitGlowMesh.position = new Vector3(0, 0.01, HIT_Z);
  const hitGlowMat = new StandardMaterial('ghHitGlowMat', scene);
  hitGlowMat.emissiveColor = new Color3(0.35, 0.38, 0.55);
  hitGlowMat.alpha = 0.12;
  hitGlowMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  hitGlowMesh.material = hitGlowMat;
  hitGlowMesh.renderingGroupId = 1;

  const ptex = new DynamicTexture('ghParticleTex', { width: 16, height: 16 }, scene, false);
  const pctx = ptex.getContext();
  pctx.fillStyle = 'white';
  pctx.beginPath();
  pctx.arc(8, 8, 7, 0, Math.PI * 2);
  pctx.fill();
  ptex.update();

  const ambientEmitter = MeshBuilder.CreateBox('ghAmbientEmitter', { size: 0.01 }, scene);
  ambientEmitter.parent = root;
  ambientEmitter.isVisible = false;
  ambientEmitter.isPickable = false;

  const ambient = new ParticleSystem('ghAmbient', particles.ambientMax, scene);
  ambient.particleTexture = ptex;
  ambient.emitter = ambientEmitter;
  ambient.minEmitBox = new Vector3(-HIGHWAY_W / 2, 0.2, -HIGHWAY_DEPTH / 2);
  ambient.maxEmitBox = new Vector3(HIGHWAY_W / 2, 2.2, HIGHWAY_DEPTH / 2);
  ambient.color1 = new Color4(0.25, 0.45, 1, 0.28);
  ambient.color2 = new Color4(0.35, 0.4, 1, 0.18);
  ambient.colorDead = new Color4(0.15, 0.25, 0.7, 0);
  ambient.minSize = 0.03;
  ambient.maxSize = 0.07;
  ambient.minLifeTime = 4;
  ambient.maxLifeTime = 8;
  ambient.emitRate = particles.ambientEmitRate;
  ambient.minEmitPower = 0.015;
  ambient.maxEmitPower = 0.04;
  ambient.direction1 = new Vector3(-0.08, 0.5, 0.08);
  ambient.direction2 = new Vector3(0.08, 0.9, 0.1);
  ambient.gravity = new Vector3(0, 0, 0.07);
  ambient.blendMode = ParticleSystem.BLENDMODE_STANDARD;
  ambient.start();

  const BURST_COUNT = particles.burstCount;
  const spawnBurst = (lane: DrumLane) => {
    const isKick = lane === DrumLane.Kick;
    const laneIdx = isKick ? -1 : LANE_ORDER.indexOf(lane as (typeof LANE_ORDER)[number]);
    const x = isKick ? 0 : laneXBab(laneIdx);
    const y = isKick ? 0.045 : 0.1;
    const c = hexToColor3(LANE_COLORS[lane]);
    const burst = new ParticleSystem(`ghBurst-${seq++}`, BURST_COUNT, scene);
    burst.particleTexture = ptex;
    const world = Vector3.TransformCoordinates(new Vector3(x, y, HIT_Z), root.getWorldMatrix());
    burst.emitter = world;
    burst.minEmitBox = new Vector3(-0.1, -0.04, -0.04);
    burst.maxEmitBox = new Vector3(0.1, 0.04, 0.04);
    burst.color1 = new Color4(c.r, c.g, c.b, 1);
    burst.color2 = new Color4(c.r * 0.85, c.g * 0.85, c.b * 0.85, 0.9);
    burst.colorDead = new Color4(c.r, c.g, c.b, 0);
    burst.minSize = 0.08;
    burst.maxSize = 0.18;
    burst.minLifeTime = 0.25;
    burst.maxLifeTime = 0.52;
    burst.emitRate = 0;
    burst.manualEmitCount = BURST_COUNT;
    burst.minEmitPower = 2.2;
    burst.maxEmitPower = 4.8;
    burst.direction1 = new Vector3(-1, 1.4, -0.4);
    burst.direction2 = new Vector3(1, 3.5, 0.4);
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
    const mat = new StandardMaterial(`ghPadMat-${lane}`, scene);
    mat.diffuseColor = c.scale(0.25);
    mat.emissiveColor = padDimColor;
    mat.specularColor = c.scale(0.35);
    mat.alpha = 0.75;
    mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
    const pad = MeshBuilder.CreateBox(`ghPad-${lane}`, { width: LANE_W - 0.06, height: 0.12, depth: 0.42 }, scene);
    pad.parent = root;
    pad.position = new Vector3(laneXBab(idx), 0.06, HIT_Z + 0.04);
    pad.material = mat;
    pad.renderingGroupId = 1;
    padMatsMap.set(lane as number, mat);
    padLitColors.set(lane as number, c.scale(0.9));
  });

  const kickC = hexToColor3(LANE_COLORS[DrumLane.Kick]);
  const kickPadMat = new StandardMaterial('ghKickPadMat', scene);
  kickPadMat.diffuseColor = kickC.scale(0.25);
  kickPadMat.emissiveColor = padDimColor;
  kickPadMat.specularColor = kickC.scale(0.35);
  kickPadMat.alpha = 0.75;
  kickPadMat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
  const kickPad = MeshBuilder.CreateBox('ghKickPad', { width: HIGHWAY_W - 0.1, height: 0.08, depth: 0.38 }, scene);
  kickPad.parent = root;
  kickPad.position = new Vector3(0, 0.04, HIT_Z + 0.07);
  kickPad.material = kickPadMat;
  kickPad.renderingGroupId = 1;
  padMatsMap.set(DrumLane.Kick as number, kickPadMat);
  padLitColors.set(DrumLane.Kick as number, kickC.scale(0.9));

  const noteTemplates = new Map<DrumLane, Mesh>();
  for (const lane of [...LANE_ORDER, DrumLane.Kick] as DrumLane[]) {
    const isKick = lane === DrumLane.Kick;
    const tmpl = MeshBuilder.CreateBox(`ghTmpl-${lane}`, {
      width: isKick ? HIGHWAY_W - 0.12 : LANE_W - 0.05,
      height: isKick ? 0.1 : 0.18,
      depth: isKick ? 0.4 : 0.48,
    }, scene);
    tmpl.isVisible = false;
    const c = hexToColor3(LANE_COLORS[lane]);
    const mat = new StandardMaterial(`ghNoteMat-${lane}`, scene);
    mat.diffuseColor = c.scale(0.75);
    mat.emissiveColor = c.scale(0.55);
    mat.specularColor = c;
    tmpl.material = mat;
    noteTemplates.set(lane, tmpl);
  }

  const pool: ActiveConcertNote[] = chart.notes
    .filter((n) => MIDI_TO_LANE[n.midi] !== undefined)
    .map((n) => {
      const lane = MIDI_TO_LANE[n.midi];
      const isKick = lane === DrumLane.Kick;
      const laneIdx = isKick ? -1 : LANE_ORDER.indexOf(lane as (typeof LANE_ORDER)[number]);
      const instance = noteTemplates.get(lane)!.createInstance(`ghNote-${seq++}`);
      instance.parent = root;
      instance.position = new Vector3(isKick ? 0 : laneXBab(laneIdx), isKick ? 0.045 : 0.1, -HIGHWAY_DEPTH);
      instance.isVisible = false;
      instance.renderingGroupId = 1;
      return { ...n, lane, laneIdx, missed: false, instance };
    });

  return {
    highwayRoot: root,
    pool,
    spawnBurst,
    padMatsMap,
    padLitColors,
  };
}
