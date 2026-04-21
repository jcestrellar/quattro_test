import {
  AbstractMesh,
  Color3,
  DirectionalLight,
  FreeCamera,
  HemisphericLight,
  MeshBuilder,
  PointLight,
  Scene,
  ShadowGenerator,
  SpotLight,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export interface LightingSetup {
  shadowGenerator: ShadowGenerator;
}

export interface LightingPerfOptions {
  shadowMapSize: number;
  usePcfShadow: boolean;
  whiteRigCount: 1 | 2;
  showBeamMeshes: boolean;
}

interface CameraAlignedLights {
  keyLight: DirectionalLight;
  pointLight: PointLight;
  areaLight: SpotLight;
}

interface WhiteRigLight {
  spotlight: SpotLight;
  beam: AbstractMesh | null;
  origin: Vector3;
  baseDirection: Vector3;
  phaseOffset: number;
}

const createGlobalLayer = (scene: Scene): HemisphericLight => {
  const globalLight = new HemisphericLight('globalLight', new Vector3(0, 1, 0), scene);
  globalLight.intensity = 0.26;
  globalLight.groundColor = new Color3(0.04, 0.025, 0.06);
  globalLight.diffuse = new Color3(0.94, 0.52, 0.3);
  return globalLight;
};

const createPointLayer = (scene: Scene): PointLight => {
  const pointLight = new PointLight('pointAccentLight', new Vector3(0, 3.2, 1.2), scene);
  pointLight.intensity = 1.2;
  pointLight.diffuse = new Color3(1, 0.93, 0.86);
  pointLight.specular = new Color3(1, 0.95, 0.9);
  return pointLight;
};

const createAreaLayer = (scene: Scene): SpotLight => {
  const areaLight = new SpotLight(
    'areaFillLight',
    new Vector3(1.5, 5.6, -0.5),
    new Vector3(-0.15, -1, 0.2),
    1.75,
    2,
    scene,
  );
  areaLight.intensity = 1.35;
  areaLight.diffuse = new Color3(0.74, 0.82, 1);
  return areaLight;
};

const getForwardFromRotation = (rotation: Vector3): Vector3 => {
  const pitch = rotation.x;
  const yaw = rotation.y;

  return new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ).normalize();
};

const rotateDirectionAroundY = (direction: Vector3, angle: number): Vector3 => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = direction.x * cos - direction.z * sin;
  const z = direction.x * sin + direction.z * cos;
  return new Vector3(x, direction.y, z).normalize();
};

const updateBeamTransform = (
  beam: AbstractMesh,
  origin: Vector3,
  direction: Vector3,
  beamLength: number,
): void => {
  const beamCenter = origin.add(direction.scale(beamLength * 0.5));
  beam.position.copyFrom(beamCenter);
  beam.lookAt(origin.add(direction.scale(beamLength)));
  beam.rotate(Vector3.Right(), Math.PI * 0.5);
};

const SNAPSHOTS = [
  {
    name: 'forwardWhiteRigA',
    position: new Vector3(-0.125, 4.397, 2.849),
    rotation: new Vector3(0.51, 8.405, 0),
    intensity: 5.8,
  },
  {
    name: 'forwardWhiteRigB',
    position: new Vector3(0.209, 3.909, -2.92),
    rotation: new Vector3(0.382, 7.152, 0),
    intensity: 5.2,
  },
];

const createForwardWhiteRigs = (
  scene: Scene,
  rigCount: 1 | 2,
  showBeams: boolean,
): WhiteRigLight[] => {
  const rigs: WhiteRigLight[] = [];
  const snapshots = SNAPSHOTS.slice(0, rigCount);

  for (const snapshot of snapshots) {
    const direction = getForwardFromRotation(snapshot.rotation);
    const spotlight = new SpotLight(
      snapshot.name,
      snapshot.position,
      direction,
      0.68,
      1.8,
      scene,
    );
    spotlight.intensity = snapshot.intensity;
    spotlight.diffuse = new Color3(1, 1, 1);
    spotlight.specular = new Color3(1, 1, 1);
    spotlight.range = 42;

    let beam: AbstractMesh | null = null;
    const beamLength = 14;
    if (showBeams) {
      beam = MeshBuilder.CreateCylinder(
        `${snapshot.name}Beam`,
        {
          height: beamLength,
          diameterTop: 0.08,
          diameterBottom: 1.9,
          tessellation: 16,
        },
        scene,
      );
      const beamMaterial = new StandardMaterial(`${snapshot.name}BeamMat`, scene);
      beamMaterial.disableLighting = true;
      beamMaterial.emissiveColor = new Color3(1, 1, 1);
      beamMaterial.alpha = 0.14;
      beamMaterial.backFaceCulling = false;
      beam.material = beamMaterial;
      beam.isPickable = false;
      updateBeamTransform(beam, snapshot.position, direction, beamLength);
    }

    rigs.push({
      spotlight,
      beam,
      origin: snapshot.position.clone(),
      baseDirection: direction.clone(),
      phaseOffset: snapshot.name.endsWith('A') ? 0 : Math.PI,
    });
  }

  return rigs;
};

const animateWhiteRigSway = (scene: Scene, rigs: WhiteRigLight[]): void => {
  const swayAmplitude = 0.22;
  const swaySpeed = 0.95;
  const beamLength = 14;

  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() * 0.001;

    for (const rig of rigs) {
      const yawOffset = Math.sin(t * swaySpeed + rig.phaseOffset) * swayAmplitude;
      const swayedDirection = rotateDirectionAroundY(rig.baseDirection, yawOffset);

      rig.spotlight.position.copyFrom(rig.origin);
      rig.spotlight.direction.copyFrom(swayedDirection);
      if (rig.beam) {
        updateBeamTransform(rig.beam, rig.origin, swayedDirection, beamLength);
      }
    }
  });
};

const createShadowLayer = (
  scene: Scene,
  mapSize: number,
  usePcf: boolean,
): { keyLight: DirectionalLight; shadowGenerator: ShadowGenerator } => {
  const keyLight = new DirectionalLight('keyShadowLight', new Vector3(-0.2, -1, 0.35), scene);
  keyLight.position = new Vector3(0, 6, -4);
  keyLight.intensity = 1.7;

  const shadowGenerator = new ShadowGenerator(mapSize, keyLight);
  shadowGenerator.darkness = 0.45;
  shadowGenerator.bias = 0.0008;
  shadowGenerator.normalBias = 0.02;

  if (usePcf) {
    shadowGenerator.usePercentageCloserFiltering = true;
    shadowGenerator.blurKernel = 16;
    shadowGenerator.useBlurExponentialShadowMap = false;
  } else {
    shadowGenerator.usePercentageCloserFiltering = false;
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 8;
  }

  return { keyLight, shadowGenerator };
};

const alignLightsToCamera = (camera: FreeCamera, lights: CameraAlignedLights): void => {
  const cameraPosition = camera.position.clone();
  const cameraForward = camera.getForwardRay().direction.normalize();

  lights.pointLight.position.copyFrom(
    cameraPosition.add(new Vector3(0, 2.1, 0)).add(cameraForward.scale(1.3)),
  );

  const areaPosition = cameraPosition
    .add(new Vector3(0, 3.4, 0))
    .add(cameraForward.scale(2.6));
  lights.areaLight.position.copyFrom(areaPosition);
  lights.areaLight.direction.copyFrom(cameraPosition.subtract(areaPosition).normalize());

  lights.keyLight.position.copyFrom(
    cameraPosition.add(new Vector3(0, 5.8, 0)).add(cameraForward.scale(3.2)),
  );
  lights.keyLight.direction.copyFrom(cameraPosition.subtract(lights.keyLight.position).normalize());
};

export const setupLightingLayers = (
  scene: Scene,
  camera: FreeCamera,
  perf: LightingPerfOptions,
): LightingSetup => {
  scene.shadowsEnabled = true;
  createGlobalLayer(scene);
  const pointLight = createPointLayer(scene);
  const areaLight = createAreaLayer(scene);
  const whiteRigLights = createForwardWhiteRigs(scene, perf.whiteRigCount, perf.showBeamMeshes);
  animateWhiteRigSway(scene, whiteRigLights);
  const { keyLight, shadowGenerator } = createShadowLayer(scene, perf.shadowMapSize, perf.usePcfShadow);

  alignLightsToCamera(camera, {
    keyLight,
    pointLight,
    areaLight,
  });
  scene.onBeforeRenderObservable.add(() => {
    alignLightsToCamera(camera, {
      keyLight,
      pointLight,
      areaLight,
    });
  });

  return { shadowGenerator };
};

const hasVertices = (mesh: AbstractMesh): boolean => mesh.getTotalVertices() > 0;

const normalizeImportedMaterials = (scene: Scene, maxLights: number): void => {
  for (const material of scene.materials) {
    // UI del highway (gh*): sin iluminación dinámica; no tocar (emisivo propio).
    if (/^gh/i.test(material.name)) {
      continue;
    }

    const candidate = material as {
      disableLighting?: boolean;
      unlit?: boolean;
      emissiveColor?: { scaleInPlace: (factor: number) => void };
      maxSimultaneousLights?: number;
    };

    if (typeof candidate.disableLighting === 'boolean') {
      candidate.disableLighting = false;
    }
    if (typeof candidate.unlit === 'boolean') {
      candidate.unlit = false;
    }
    if (candidate.emissiveColor) {
      candidate.emissiveColor.scaleInPlace(0.2);
    }
    if ('maxSimultaneousLights' in material) {
      (material as { maxSimultaneousLights: number }).maxSimultaneousLights = maxLights;
    }
  }
};

export const applyLightingLayersToScene = (
  scene: Scene,
  shadowGenerator: ShadowGenerator,
  casterPattern: RegExp,
  maxLights: number,
): void => {
  normalizeImportedMaterials(scene, maxLights);

  let casterCount = 0;
  for (const mesh of scene.meshes) {
    if (!hasVertices(mesh)) {
      continue;
    }

    mesh.receiveShadows = true;
    if (casterPattern.test(mesh.name)) {
      shadowGenerator.addShadowCaster(mesh, true);
      casterCount++;
    }
  }

  if (casterCount === 0) {
    for (const mesh of scene.meshes) {
      if (!hasVertices(mesh)) continue;
      shadowGenerator.addShadowCaster(mesh, true);
    }
  }
};
