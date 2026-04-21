import { AbstractMesh, Color3, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import { DrumLane } from '../../drumRhythm/drumPadMap';

const LANE_MESH_PREFIXES: Record<DrumLane, string[]> = {
  [DrumLane.Kick]: ['Bass'],
  [DrumLane.Red]: ['Lid.003', 'Lid.002', 'Lid.001', 'Lid'],
  [DrumLane.Yellow]: ['Cymbal_HitHat'],
  [DrumLane.Blue]: ['Cymbal_Ride'],
  [DrumLane.Green]: ['Cymbal_Crash'],
};

function findMeshByPrefixes(meshes: AbstractMesh[], prefixes: string[]): AbstractMesh | null {
  for (const prefix of prefixes) {
    const found = meshes.find((m) => m.name.startsWith(prefix) && m.getTotalVertices() > 0);
    if (found) {
      return found;
    }
  }
  return null;
}

export function buildFallbackDrumKit(scene: Scene): AbstractMesh[] {
  const mat = (name: string, c: Color3) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = c.scale(0.35);
    m.specularColor = c.scale(0.5);
    m.emissiveColor = c.scale(0.08);
    return m;
  };

  const tess = 16;
  const meshes: AbstractMesh[] = [
    MeshBuilder.CreateBox('Bass', { width: 1.85, height: 0.12, depth: 0.58 }, scene),
    MeshBuilder.CreateCylinder('Lid.001', { height: 0.06, diameter: 0.48, tessellation: tess }, scene),
    MeshBuilder.CreateCylinder('Cymbal_HitHat', { height: 0.02, diameter: 0.42, tessellation: tess }, scene),
    MeshBuilder.CreateCylinder('Cymbal_Ride', { height: 0.02, diameter: 0.44, tessellation: tess }, scene),
    MeshBuilder.CreateCylinder('Cymbal_Crash', { height: 0.02, diameter: 0.46, tessellation: tess }, scene),
  ];

  meshes[0].position = new Vector3(0, 0.06, 0.32);
  meshes[0].material = mat('mBass', new Color3(1, 0.45, 0.12));

  meshes[1].position = new Vector3(-0.52, 0.2, -0.12);
  meshes[1].material = mat('mSnare', new Color3(0.9, 0.15, 0.15));

  meshes[2].position = new Vector3(-0.88, 0.58, 0.02);
  meshes[2].material = mat('mHat', new Color3(1, 0.9, 0.2));

  meshes[3].position = new Vector3(0.38, 0.68, -0.22);
  meshes[3].material = mat('mRide', new Color3(0.2, 0.55, 1));

  meshes[4].position = new Vector3(0.85, 0.64, 0.05);
  meshes[4].material = mat('mCrash', new Color3(0.15, 0.85, 0.35));

  return meshes;
}

const ALL_LANES: DrumLane[] = [
  DrumLane.Kick,
  DrumLane.Red,
  DrumLane.Yellow,
  DrumLane.Blue,
  DrumLane.Green,
];

export function bindLaneAnchors(stageMeshes: AbstractMesh[]): Map<DrumLane, AbstractMesh> {
  const map = new Map<DrumLane, AbstractMesh>();
  for (const lane of ALL_LANES) {
    const mesh = findMeshByPrefixes(stageMeshes, LANE_MESH_PREFIXES[lane]);
    if (mesh) {
      map.set(lane, mesh);
    }
  }
  return map;
}

export function ensureAnchorsForAllLanes(
  scene: Scene,
  anchors: Map<DrumLane, AbstractMesh>,
): Map<DrumLane, AbstractMesh> {
  const fallbackPos: Record<DrumLane, Vector3> = {
    [DrumLane.Kick]: new Vector3(0, 0.15, 0.35),
    [DrumLane.Red]: new Vector3(-0.52, 0.22, -0.1),
    [DrumLane.Yellow]: new Vector3(-0.88, 0.58, 0.02),
    [DrumLane.Blue]: new Vector3(0.38, 0.68, -0.2),
    [DrumLane.Green]: new Vector3(0.85, 0.64, 0.05),
  };
  const out = new Map(anchors);
  for (const lane of ALL_LANES) {
    if (out.has(lane)) continue;
    const m = MeshBuilder.CreateBox(`laneAnchor_${lane}`, { width: 0.02, height: 0.02, depth: 0.02 }, scene);
    m.position.copyFrom(fallbackPos[lane]);
    m.isVisible = false;
    m.isPickable = false;
    const mat = new StandardMaterial(`laneAnchorMat_${lane}`, scene);
    mat.alpha = 0;
    m.material = mat;
    out.set(lane, m);
  }
  return out;
}
