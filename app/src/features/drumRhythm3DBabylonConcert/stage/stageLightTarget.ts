import { AbstractMesh, Vector3 } from '@babylonjs/core';
import type { DrumLane } from '../../drumRhythm/drumPadMap';

/**
 * Centro mundial del conjunto de mallas (p. ej. Stage.glb) para apuntar focos.
 */
export function computeMeshesWorldCenter(meshes: AbstractMesh[], fallback: Vector3): Vector3 {
  if (meshes.length === 0) {
    return fallback.clone();
  }

  let min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  let max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  let any = false;

  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const bi = mesh.getBoundingInfo?.();
    if (!bi) {
      continue;
    }
    const bb = bi.boundingBox;
    any = true;
    min = Vector3.Minimize(min, bb.minimumWorld);
    max = Vector3.Maximize(max, bb.maximumWorld);
  }

  if (!any) {
    return fallback.clone();
  }

  return min.add(max).scaleInPlace(0.5);
}

/**
 * Centro de la batería (promedio de anclas de lane) — mejor que el bbox del Stage entero
 * para que los focos apunten al kit y no al suelo/carril.
 */
export function computeDrumKitFocusFromAnchors(
  anchors: Map<DrumLane, AbstractMesh>,
  fallback: Vector3,
): Vector3 {
  if (anchors.size === 0) {
    return fallback.clone();
  }

  const acc = new Vector3(0, 0, 0);
  let n = 0;
  for (const mesh of anchors.values()) {
    mesh.computeWorldMatrix(true);
    acc.addInPlace(mesh.getAbsolutePosition());
    n++;
  }
  if (n === 0) {
    return fallback.clone();
  }
  return acc.scaleInPlace(1 / n);
}
