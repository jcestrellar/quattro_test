import { AbstractMesh, InstancedMesh } from '@babylonjs/core';

const isInstancedMesh = (mesh: AbstractMesh): mesh is InstancedMesh =>
  'sourceMesh' in mesh && mesh.sourceMesh !== undefined;

const cloneInstanceAsUniqueMesh = (instance: InstancedMesh): AbstractMesh | null => {
  const sourceMesh = instance.sourceMesh;
  const uniqueMesh = sourceMesh.clone(
    `${instance.name}_unique_${instance.uniqueId}`,
    instance.parent ?? null,
    true,
  );
  if (!uniqueMesh) {
    return null;
  }

  uniqueMesh.position.copyFrom(instance.position);
  uniqueMesh.scaling.copyFrom(instance.scaling);
  uniqueMesh.visibility = instance.visibility;
  uniqueMesh.isPickable = instance.isPickable;
  uniqueMesh.metadata = instance.metadata;
  uniqueMesh.setEnabled(instance.isEnabled());
  uniqueMesh.material = instance.material ?? sourceMesh.material;

  if (instance.rotationQuaternion) {
    uniqueMesh.rotationQuaternion = instance.rotationQuaternion.clone();
  } else {
    uniqueMesh.rotationQuaternion = null;
    uniqueMesh.rotation.copyFrom(instance.rotation);
  }

  return uniqueMesh;
};

export const normalizeStageInstancedMeshes = (stageMeshes: AbstractMesh[]): AbstractMesh[] => {
  const normalizedMeshes: AbstractMesh[] = [];
  const instancesToDispose: InstancedMesh[] = [];

  for (const mesh of stageMeshes) {
    if (!isInstancedMesh(mesh)) {
      normalizedMeshes.push(mesh);
      continue;
    }

    const uniqueMesh = cloneInstanceAsUniqueMesh(mesh);
    if (uniqueMesh) {
      normalizedMeshes.push(uniqueMesh);
    }
    instancesToDispose.push(mesh);
  }

  for (const instance of instancesToDispose) {
    instance.dispose(false, false);
  }

  return normalizedMeshes.filter((mesh) => !mesh.isDisposed());
};
