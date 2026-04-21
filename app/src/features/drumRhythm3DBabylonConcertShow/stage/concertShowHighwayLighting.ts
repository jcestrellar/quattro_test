import { AbstractMesh, Color3, FreeCamera, PointLight, Scene, Vector3 } from '@babylonjs/core';

/**
 * El carril GH no recibe las luces del show del Stage (prefijo `show*`).
 */
export function excludeHighwayMeshesFromShowLights(scene: Scene, highwayMeshes: AbstractMesh[]): void {
  if (highwayMeshes.length === 0) {
    return;
  }
  for (const light of scene.lights) {
    if (light.name.startsWith('show')) {
      light.excludedMeshes = highwayMeshes;
    }
  }
}

export interface HighwayFillLightHandle {
  light: PointLight;
  dispose: () => void;
}

/**
 * Iluminación estable solo para el highway (UI), independiente del rig del escenario.
 */
export function createHighwayOwnFillLight(scene: Scene, camera: FreeCamera, highwayMeshes: AbstractMesh[]): HighwayFillLightHandle {
  const pl = new PointLight('ghUiFill', new Vector3(0, 0, 0), scene);
  pl.diffuse = new Color3(0.93, 0.95, 1);
  pl.specular = new Color3(0.45, 0.48, 0.55);
  pl.intensity = 1.05;
  pl.range = 24;
  pl.includedOnlyMeshes = highwayMeshes;

  const obs = scene.onBeforeRenderObservable.add(() => {
    const f = camera.getForwardRay().direction.normalize();
    pl.position.copyFrom(camera.globalPosition.add(f.scale(3.4)).add(new Vector3(0, 1.15, 0)));
  });

  return {
    light: pl,
    dispose: () => {
      scene.onBeforeRenderObservable.remove(obs);
      pl.dispose();
    },
  };
}
