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
import { applyCartoonStylized } from '../../drumRhythm3DBabylonConcert/stage/cartoonStylized';
import { applyLightingLayersToScene } from '../../drumRhythm3DBabylonConcert/stage/lightingLayers';
import { normalizeStageInstancedMeshes } from '../../drumRhythm3DBabylonConcert/stage/stageMeshNormalization';
import { bindLaneAnchors, buildFallbackDrumKit, ensureAnchorsForAllLanes } from '../../drumRhythm3DBabylonConcert/stage/stageLaneAnchors';
import { SystemDevice } from '../../../functions/systemDevice';
import { vitePublicUrl } from '../../../utils/vitePublicUrl';
import {
  computeDrumKitFocusFromAnchors,
  computeMeshesWorldCenter,
} from '../../drumRhythm3DBabylonConcert/stage/stageLightTarget';
import { CONCERT_SHOW_PERF } from './concertShowPerf';
import { setupConcertShowLighting } from './concertShowLighting';

export interface ConcertShowStageHandles {
  engine: Engine;
  scene: Scene;
  camera: FreeCamera;
  stageMeshes: AbstractMesh[];
  laneAnchors: Map<DrumLane, AbstractMesh>;
  usedFallbackKit: boolean;
  dispose: () => void;
}

export async function createConcertShowStageScene(canvas: HTMLCanvasElement): Promise<ConcertShowStageHandles> {
  const engine = new Engine(
    canvas,
    false,
    {
      preserveDrawingBuffer: false,
      stencil: false,
      powerPreference: SystemDevice.isMobile ? 'default' : 'high-performance',
    },
    !SystemDevice.isMobile,
  );
  engine.setHardwareScalingLevel(CONCERT_SHOW_PERF.hardwareScalingLevel);

  const scene = new Scene(engine);

  /* Atardecer: menos relleno global, cielo cálido y bruma suave */
  scene.clearColor = new Color4(0.08, 0.05, 0.12, 1);
  scene.ambientColor = new Color3(0.11, 0.09, 0.12);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0105;
  scene.fogColor = new Color3(0.22, 0.12, 0.16);
  scene.imageProcessingConfiguration.exposure = 1.02;
  scene.imageProcessingConfiguration.contrast = 1.06;
  scene.autoClear = true;

  const camera = new FreeCamera('concertShowCam', new Vector3(5.762, 3.951, 0.132), scene);
  camera.rotation = new Vector3(0.461, 4.708, 0);
  camera.fov = 0.85;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  scene.activeCamera = camera;

  if (CONCERT_SHOW_PERF.enableCartoonPostProcess) {
    applyCartoonStylized(scene, camera);
  }

  let stageMeshes: AbstractMesh[] = [];
  let usedFallbackKit = false;

  const stageGlbFolder = vitePublicUrl('assets/').replace(/\/?$/, '/');

  try {
    const result = await SceneLoader.ImportMeshAsync('', stageGlbFolder, 'Stage.glb', scene);
    stageMeshes = normalizeStageInstancedMeshes(result.meshes);
  } catch (e) {
    console.warn(
      `[concertShow] No se pudo cargar ${vitePublicUrl('assets/Stage.glb')} — kit procedural.`,
      e,
    );
    stageMeshes = buildFallbackDrumKit(scene);
    usedFallbackKit = true;
  }

  let laneAnchors = bindLaneAnchors(stageMeshes);
  laneAnchors = ensureAnchorsForAllLanes(scene, laneAnchors);

  const bboxFallback = computeMeshesWorldCenter(stageMeshes, new Vector3(0, 1.12, 0));
  const stageLightTarget = computeDrumKitFocusFromAnchors(laneAnchors, bboxFallback);

  const { shadowGenerator } = setupConcertShowLighting(
    scene,
    camera,
    {
      shadowMapSize: CONCERT_SHOW_PERF.shadowMapSize,
      usePcfShadow: CONCERT_SHOW_PERF.usePcfShadow,
      shadowCheapPass: CONCERT_SHOW_PERF.shadowCheapPass,
      enableVolumetricBeams: CONCERT_SHOW_PERF.enableVolumetricBeams,
      lightUpdateStride: CONCERT_SHOW_PERF.lightUpdateStride,
    },
    stageLightTarget,
  );

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
    CONCERT_SHOW_PERF.shadowCasterNamePattern,
    CONCERT_SHOW_PERF.maxSimultaneousLights,
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
