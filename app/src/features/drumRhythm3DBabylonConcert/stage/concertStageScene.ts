import '@babylonjs/loaders/glTF';

import type { DrumLane } from '../../drumRhythm/drumPadMap';
import {
  AbstractMesh,
  Color3,
  Color4,
  Engine,
  FreeCamera,
  Scene,
  SceneLoader,
  Vector3,
} from '@babylonjs/core';
import { applyCartoonStylized } from './cartoonStylized';
import { applyLightingLayersToScene, setupLightingLayers } from './lightingLayers';
import { CONCERT_PERF } from './concertPerf';
import { normalizeStageInstancedMeshes } from './stageMeshNormalization';
import { bindLaneAnchors, buildFallbackDrumKit, ensureAnchorsForAllLanes } from './stageLaneAnchors';
import { vitePublicUrl } from '../../../utils/vitePublicUrl';

export interface ConcertStageHandles {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  stageMeshes: AbstractMesh[];
  laneAnchors: Map<DrumLane, AbstractMesh>;
  usedFallbackKit: boolean;
  dispose: () => void;
}

export async function createConcertStageScene(canvas: HTMLCanvasElement): Promise<ConcertStageHandles> {
  const engine = new Engine(canvas, false, {
    preserveDrawingBuffer: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  engine.setHardwareScalingLevel(CONCERT_PERF.hardwareScalingLevel);

  const scene = new Scene(engine);

  scene.clearColor = new Color4(0.03, 0.04, 0.06, 1);
  scene.ambientColor = new Color3(0.22, 0.22, 0.26);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.014;
  scene.fogColor = new Color3(0.18, 0.1, 0.12);
  scene.imageProcessingConfiguration.exposure = 1.06;
  scene.imageProcessingConfiguration.contrast = 1.08;
  scene.autoClear = true;

  const camera = new FreeCamera('concertCam', new Vector3(5.762, 3.951, 0.132), scene);
  camera.rotation = new Vector3(0.461, 4.708, 0);
  camera.fov = 0.85;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  scene.activeCamera = camera;

  if (CONCERT_PERF.enableCartoonPostProcess) {
    applyCartoonStylized(scene, camera);
  }

  const { shadowGenerator } = setupLightingLayers(scene, camera, {
    shadowMapSize: CONCERT_PERF.shadowMapSize,
    usePcfShadow: CONCERT_PERF.usePcfShadow,
    whiteRigCount: CONCERT_PERF.whiteRigCount,
    showBeamMeshes: CONCERT_PERF.showBeamMeshes,
  });

  let stageMeshes: AbstractMesh[] = [];
  let usedFallbackKit = false;

  const stageGlbFolder = vitePublicUrl('assets/').replace(/\/?$/, '/');

  try {
    const result = await SceneLoader.ImportMeshAsync('', stageGlbFolder, 'Stage.glb', scene);
    stageMeshes = normalizeStageInstancedMeshes(result.meshes);
  } catch (e) {
    console.warn(
      `[concertStage] No se pudo cargar ${vitePublicUrl('assets/Stage.glb')} — kit procedural.`,
      e,
    );
    stageMeshes = buildFallbackDrumKit(scene);
    usedFallbackKit = true;
  }

  let laneAnchors = bindLaneAnchors(stageMeshes);
  laneAnchors = ensureAnchorsForAllLanes(scene, laneAnchors);

  const anchorMeshes = new Set(laneAnchors.values());
  for (const m of stageMeshes) {
    if (anchorMeshes.has(m)) {
      continue;
    }
    try {
      m.freezeWorldMatrix();
    } catch {
      /* noop */
    }
  }

  applyLightingLayersToScene(
    scene,
    shadowGenerator,
    CONCERT_PERF.shadowCasterNamePattern,
    CONCERT_PERF.maxSimultaneousLights,
  );

  const dispose = (): void => {
    scene.dispose();
    engine.dispose();
  };

  return {
    engine,
    scene,
    camera,
    stageMeshes,
    laneAnchors,
    usedFallbackKit,
    dispose,
  };
}
