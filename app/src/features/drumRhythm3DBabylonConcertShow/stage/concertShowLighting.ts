import {
  AbstractMesh,
  Color3,
  DirectionalLight,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  SpotLight,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface ConcertShowLightingOptions {
  shadowMapSize: number;
  usePcfShadow: boolean;
  shadowCheapPass?: boolean;
  /** Cilindros alpha “haz volumétrico”; false ahorra mucho fill-rate en móvil. */
  enableVolumetricBeams?: boolean;
  /** Llamar `updateShowLights` cada N frames (>=1). */
  lightUpdateStride?: number;
}

function dirFromTo(from: Vector3, to: Vector3): Vector3 {
  return to.subtract(from).normalize();
}

function safeCameraBasis(camera: FreeCamera): { fwd: Vector3; right: Vector3 } {
  const fwd = camera.getForwardRay().direction.normalize();
  let right = Vector3.Cross(Vector3.Up(), fwd);
  if (right.lengthSquared() < 1e-6) {
    right = new Vector3(1, 0, 0);
  } else {
    right.normalize();
  }
  return { fwd, right };
}

/** Varias sinusoides desfasadas → trayectoria orgánica / “caótica” sin ruido aleatorio */
function messyWave(t: number, phase: number, amp: number, f1: number, f2: number, f3: number): number {
  return (
    amp *
    (0.42 * Math.sin(t * f1 + phase) +
      0.28 * Math.sin(t * f2 + phase * 2.13) +
      0.22 * Math.cos(t * f3 + phase * 0.67) +
      0.18 * Math.sin(t * ((f1 + f3) * 0.41) + phase * 1.4))
  );
}

type AxisMotion = { amp: number; f1: number; f2: number; f3: number; phase: number };

function axisMotion(t: number, spotPhase: number, m: AxisMotion): number {
  return messyWave(t, spotPhase + m.phase, m.amp, m.f1, m.f2, m.f3);
}

function updateVolumetricBeam(
  beam: AbstractMesh,
  origin: Vector3,
  direction: Vector3,
  beamLength: number,
): void {
  const beamCenter = origin.add(direction.scale(beamLength * 0.5));
  beam.position.copyFrom(beamCenter);
  beam.lookAt(origin.add(direction.scale(beamLength)));
  beam.rotate(Vector3.Right(), Math.PI * 0.5);
}

/**
 * Máximo 8 luces en escena (hemi + dir + 6 spots) para no superar GL_MAX_VERTEX_UNIFORM_BUFFERS.
 * Focos y haces volumétricos separados en espacio; intensidad estable (sin “apagones”).
 * Objetivo: centro del kit (`stageCenterWorld` = anclas de batería), no el highway.
 */
export function setupConcertShowLighting(
  scene: Scene,
  camera: FreeCamera,
  options: ConcertShowLightingOptions,
  stageCenterWorld: Vector3,
): { shadowGenerator: ShadowGenerator } {
  const drumBase = stageCenterWorld.clone();
  scene.shadowsEnabled = true;

  const hemi = new HemisphericLight('showHemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.17;
  hemi.diffuse = new Color3(0.95, 0.55, 0.38);
  hemi.groundColor = new Color3(0.06, 0.05, 0.12);

  const key = new DirectionalLight('showKeyShadow', new Vector3(0, -1, 0.15), scene);
  key.intensity = 1.32;
  key.diffuse = new Color3(1, 0.88, 0.68);
  key.specular = new Color3(1, 0.95, 0.88);

  const shadowGenerator = new ShadowGenerator(options.shadowMapSize, key);
  shadowGenerator.darkness = 0.36;
  shadowGenerator.bias = 0.00085;
  shadowGenerator.normalBias = 0.02;
  if (options.shadowCheapPass) {
    shadowGenerator.usePercentageCloserFiltering = false;
    shadowGenerator.useBlurExponentialShadowMap = false;
  } else if (options.usePcfShadow) {
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.blurKernel = 12;
    shadowGenerator.useBlurExponentialShadowMap = false;
  } else {
    shadowGenerator.usePercentageCloserFiltering = false;
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 6;
  }

  const angleKit = Math.PI / 4.1;
  const angleKitWide = Math.PI / 3.35;

  type SpotAnim = {
    light: SpotLight;
    lateral: number;
    fwd: number;
    height: number;
    phase: number;
    pulseHz: number;
    baseIntensity: number;
    moveLat: AxisMotion;
    moveFwd: AxisMotion;
    moveUp: AxisMotion;
    pulseChaos: { f1: number; f2: number; amp: number };
  };

  const spots: SpotAnim[] = [];

  type SpotDef = {
    id: string;
    lateral: number;
    fwd: number;
    height: number;
    color: Color3;
    phase: number;
    pulseHz: number;
    baseIntensity: number;
    angle: number;
    moveLat: AxisMotion;
    moveFwd: AxisMotion;
    moveUp: AxisMotion;
    pulseChaos: { f1: number; f2: number; amp: number };
  };

  const pushSpot = (def: SpotDef): void => {
    const spot = new SpotLight(def.id, drumBase.clone(), new Vector3(0, -1, 0), def.angle, 1.55, scene);
    spot.diffuse = def.color;
    spot.specular = def.color.clone();
    spot.specular.scaleInPlace(0.88);
    spot.intensity = def.baseIntensity;
    spot.range = 48;
    spots.push({
      light: spot,
      lateral: def.lateral,
      fwd: def.fwd,
      height: def.height,
      phase: def.phase,
      pulseHz: def.pulseHz,
      baseIntensity: def.baseIntensity,
      moveLat: def.moveLat,
      moveFwd: def.moveFwd,
      moveUp: def.moveUp,
      pulseChaos: def.pulseChaos,
    });
  };

  /* Cuatro laterales + relleno + contraluz; cada uno con animación propia (frecuencias y fases distintas) */
  pushSpot({
    id: 'showSideLime',
    lateral: -6.2,
    fwd: -0.45,
    height: 5.85,
    color: new Color3(0.45, 0.95, 0.42),
    phase: 0.2,
    pulseHz: 0.3,
    baseIntensity: 10.5,
    angle: angleKit,
    moveLat: { amp: 1.15, f1: 0.92, f2: 1.48, f3: 0.58, phase: 0.1 },
    moveFwd: { amp: 0.72, f1: 0.31, f2: 1.02, f3: 0.69, phase: 0.85 },
    moveUp: { amp: 0.62, f1: 1.18, f2: 0.51, f3: 1.72, phase: 0.4 },
    pulseChaos: { f1: 4.4, f2: 7.2, amp: 0.11 },
  });
  pushSpot({
    id: 'showSideMagenta',
    lateral: 6.2,
    fwd: -0.45,
    height: 5.85,
    color: new Color3(0.95, 0.28, 0.62),
    phase: 1.1,
    pulseHz: 0.28,
    baseIntensity: 10.5,
    angle: angleKit,
    moveLat: { amp: 1.08, f1: 0.71, f2: 1.22, f3: 0.88, phase: 2 },
    moveFwd: { amp: 0.88, f1: 0.55, f2: 0.79, f3: 1.31, phase: 1.25 },
    moveUp: { amp: 0.58, f1: 0.95, f2: 1.4, f3: 0.63, phase: 1.7 },
    pulseChaos: { f1: 5.1, f2: 6.3, amp: 0.1 },
  });
  pushSpot({
    id: 'showSideGold',
    lateral: -4.1,
    fwd: 0.15,
    height: 6.2,
    color: new Color3(1, 0.62, 0.18),
    phase: 0.55,
    pulseHz: 0.26,
    baseIntensity: 9.8,
    angle: angleKit,
    moveLat: { amp: 0.95, f1: 1.35, f2: 0.64, f3: 1.05, phase: 0.55 },
    moveFwd: { amp: 0.95, f1: 0.88, f2: 0.42, f3: 1.18, phase: 0.3 },
    moveUp: { amp: 0.72, f1: 0.62, f2: 1.55, f3: 0.91, phase: 1.1 },
    pulseChaos: { f1: 3.6, f2: 8.4, amp: 0.09 },
  });
  pushSpot({
    id: 'showSideIndigo',
    lateral: 4.1,
    fwd: 0.15,
    height: 6.2,
    color: new Color3(0.38, 0.42, 0.98),
    phase: 1.65,
    pulseHz: 0.27,
    baseIntensity: 9.5,
    angle: angleKit,
    moveLat: { amp: 1.02, f1: 0.58, f2: 1.65, f3: 0.74, phase: 2.4 },
    moveFwd: { amp: 0.78, f1: 1.12, f2: 0.36, f3: 0.95, phase: 0.95 },
    moveUp: { amp: 0.68, f1: 1.42, f2: 0.78, f3: 1.28, phase: 0.65 },
    pulseChaos: { f1: 6.2, f2: 5.5, amp: 0.1 },
  });
  pushSpot({
    id: 'showFillWarm',
    lateral: 0,
    fwd: -1.25,
    height: 6.5,
    color: new Color3(1, 0.9, 0.78),
    phase: 0,
    pulseHz: 0.22,
    baseIntensity: 11,
    angle: angleKit,
    moveLat: { amp: 1.45, f1: 0.48, f2: 0.91, f3: 1.32, phase: 0 },
    moveFwd: { amp: 0.55, f1: 0.67, f2: 1.28, f3: 0.52, phase: 1.5 },
    moveUp: { amp: 0.48, f1: 0.82, f2: 1.08, f3: 1.45, phase: 0.9 },
    pulseChaos: { f1: 2.8, f2: 4.9, amp: 0.08 },
  });
  pushSpot({
    id: 'showRimSunset',
    lateral: 0.35,
    fwd: 1.95,
    height: 5.35,
    color: new Color3(0.92, 0.38, 0.55),
    phase: 0.9,
    pulseHz: 0.2,
    baseIntensity: 8.2,
    angle: angleKitWide,
    moveLat: { amp: 1.25, f1: 1.08, f2: 0.55, f3: 1.42, phase: 1.8 },
    moveFwd: { amp: 1.1, f1: 0.42, f2: 1.15, f3: 0.61, phase: 0.45 },
    moveUp: { amp: 0.55, f1: 0.75, f2: 1.88, f3: 0.48, phase: 2.1 },
    pulseChaos: { f1: 7.5, f2: 3.9, amp: 0.12 },
  });

  const beamLen = 16;
  const useVolBeams = options.enableVolumetricBeams !== false;
  /** Haces: paleta distinta (coral, turquesa, ámbar, fucsia) acorde al atardecer */
  const volBeamColors = [
    new Color3(1, 0.38, 0.32),
    new Color3(0.22, 0.82, 0.78),
    new Color3(1, 0.62, 0.22),
    new Color3(0.92, 0.22, 0.58),
  ];
  const volBeams: AbstractMesh[] = [];
  if (useVolBeams) {
    for (let i = 0; i < 4; i++) {
      const beam = MeshBuilder.CreateCylinder(
        `showVolBeam${i}`,
        { height: beamLen, diameterTop: 0.04, diameterBottom: 2.15, tessellation: 16 },
        scene,
      );
      const mat = new StandardMaterial(`showVolBeamMat${i}`, scene);
      mat.disableLighting = true;
      mat.emissiveColor = volBeamColors[i]!.clone();
      mat.emissiveColor.scaleInPlace(0.46);
      mat.alpha = 0.09;
      mat.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;
      mat.backFaceCulling = false;
      beam.material = mat;
      beam.isPickable = false;
      volBeams.push(beam);
    }
  }

  /** Base + tres ejes animados por haz (cada uno con otro “carácter”) */
  const volBeamCfg: {
    baseLat: number;
    baseFwd: number;
    baseUp: number;
    mLat: AxisMotion;
    mFwd: AxisMotion;
    mUp: AxisMotion;
    aimPhase: number;
  }[] = [
    {
      baseLat: -7.2,
      baseFwd: -2.1,
      baseUp: 6.2,
      mLat: { amp: 1.35, f1: 0.62, f2: 1.18, f3: 0.44, phase: 0 },
      mFwd: { amp: 1.05, f1: 0.41, f2: 0.88, f3: 1.22, phase: 1.2 },
      mUp: { amp: 0.85, f1: 1.05, f2: 0.55, f3: 1.62, phase: 0.55 },
      aimPhase: 0.15,
    },
    {
      baseLat: 7,
      baseFwd: -1.6,
      baseUp: 6,
      mLat: { amp: 1.28, f1: 0.55, f2: 1.42, f3: 0.91, phase: 2.1 },
      mFwd: { amp: 0.92, f1: 0.78, f2: 0.51, f3: 1.05, phase: 0.88 },
      mUp: { amp: 0.78, f1: 0.71, f2: 1.35, f3: 0.48, phase: 1.4 },
      aimPhase: 1.85,
    },
    {
      baseLat: -3.5,
      baseFwd: 1.6,
      baseUp: 5.8,
      mLat: { amp: 1.18, f1: 1.22, f2: 0.48, f3: 0.76, phase: 0.9 },
      mFwd: { amp: 1.15, f1: 0.52, f2: 1.08, f3: 0.67, phase: 1.65 },
      mUp: { amp: 0.92, f1: 0.95, f2: 1.62, f3: 0.58, phase: 2.3 },
      aimPhase: 0.72,
    },
    {
      baseLat: 4.2,
      baseFwd: 1.35,
      baseUp: 6.75,
      mLat: { amp: 1.22, f1: 0.88, f2: 0.72, f3: 1.28, phase: 1.55 },
      mFwd: { amp: 1.08, f1: 0.95, f2: 0.62, f3: 0.84, phase: 0.35 },
      mUp: { amp: 0.88, f1: 1.28, f2: 0.71, f3: 1.02, phase: 1.95 },
      aimPhase: 2.4,
    },
  ];

  const alignKeyToDrum = (fwd: Vector3, right: Vector3, t: number): void => {
    const keyFwd = -7.1 + 0.32 * Math.sin(t * 0.51) + 0.18 * Math.cos(t * 0.88);
    const keySide = messyWave(t, 0.4, 0.55, 0.46, 0.79, 0.63);
    const keyLift = 8.45 + 0.42 * Math.sin(t * 0.37) + 0.22 * Math.sin(t * 1.12);
    const keyPos = drumBase.clone().add(fwd.scale(keyFwd)).add(right.scale(keySide)).add(new Vector3(0, keyLift, 0));
    key.position.copyFrom(keyPos);
    key.direction.copyFrom(dirFromTo(keyPos, drumBase));
  };

  const updateShowLights = (t: number): void => {
    const { fwd, right } = safeCameraBasis(camera);
    alignKeyToDrum(fwd, right, t);

    const kitFocus = drumBase.clone().add(
      new Vector3(
        messyWave(t, 0.1, 0.42, 1.12, 2.05, 0.88) + Math.sin(t * 3.1) * 0.08,
        messyWave(t, 2.4, 0.22, 0.91, 1.65, 2.2) + Math.cos(t * 2.45) * 0.05,
        messyWave(t, 4.2, 0.38, 1.02, 1.38, 1.72) + Math.sin(t * 2.8) * 0.1,
      ),
    );

    for (const s of spots) {
      const lateral = s.lateral + axisMotion(t, s.phase, s.moveLat);
      const fwdWobble = s.fwd + axisMotion(t, s.phase, s.moveFwd);
      const heightWobble = axisMotion(t, s.phase, s.moveUp);
      const pos = drumBase
        .clone()
        .add(fwd.scale(fwdWobble))
        .add(right.scale(lateral))
        .add(new Vector3(0, s.height + heightWobble, 0));

      const aim = kitFocus.clone().add(
        new Vector3(
          messyWave(t, s.phase * 3.1, 0.52, 1.85, 3.2, 1.05),
          messyWave(t, s.phase * 2.2, 0.2, 2.4, 4.1, 1.55),
          messyWave(t, s.phase * 1.4, 0.42, 1.62, 2.75, 0.91),
        ),
      );

      s.light.position.copyFrom(pos);
      s.light.direction.copyFrom(dirFromTo(pos, aim));

      const breathe = 0.9 + 0.1 * Math.sin(t * s.pulseHz * 2.1 + s.phase);
      const chaos =
        1 +
        s.pulseChaos.amp * Math.sin(t * s.pulseChaos.f1 + s.phase) +
        s.pulseChaos.amp * 0.55 * Math.sin(t * s.pulseChaos.f2 + s.phase * 1.7);
      s.light.intensity = s.baseIntensity * Math.max(0.78, breathe * chaos);
    }

    if (volBeams.length > 0) {
      for (let i = 0; i < volBeams.length; i++) {
        const cfg = volBeamCfg[i]!;
        const wLat = axisMotion(t, cfg.aimPhase + i * 0.4, cfg.mLat);
        const wFwd = axisMotion(t, cfg.aimPhase * 1.1 + i, cfg.mFwd);
        const wUp = axisMotion(t, cfg.aimPhase * 0.7 + i * 0.55, cfg.mUp);
        const origin = drumBase
          .clone()
          .add(fwd.scale(cfg.baseFwd + wFwd))
          .add(right.scale(cfg.baseLat + wLat))
          .add(new Vector3(0, cfg.baseUp + wUp, 0));

        const aimVol = kitFocus.clone().add(
          new Vector3(
            messyWave(t, cfg.aimPhase + 5, 0.65, 1.25, 2.85, 0.72),
            messyWave(t, cfg.aimPhase + 1.2, 0.35, 1.95, 3.4, 1.18),
            messyWave(t, cfg.aimPhase + 3.1, 0.55, 0.88, 2.1, 1.45),
          ),
        );
        const dir = dirFromTo(origin, aimVol);
        updateVolumetricBeam(volBeams[i]!, origin, dir, beamLen);
        const mat = volBeams[i]!.material as StandardMaterial;
        const tint =
          0.4 +
          0.14 * Math.sin(t * 1.05 + i * 1.15) +
          0.08 * Math.sin(t * 4.2 + i * 2.1);
        mat.emissiveColor.copyFrom(volBeamColors[i]!.clone().scaleInPlace(tint));
      }
    }
  };

  updateShowLights(performance.now() * 0.001);

  const stride = Math.max(1, Math.floor(options.lightUpdateStride ?? 1));
  let lightTick = 0;
  scene.onBeforeRenderObservable.add(() => {
    lightTick++;
    if ((lightTick - 1) % stride !== 0) {
      return;
    }
    updateShowLights(performance.now() * 0.001);
  });

  return { shadowGenerator };
}
