import {
  AbstractMesh,
  Color3,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { DrumLane } from '../../drumRhythm/drumPadMap';

export interface RhythmNoteVisual {
  update: (songTimeMs: number, noteTimeMs: number, leadTimeMs: number) => void;
  markHit: () => void;
  dispose: () => void;
}

const getMeshWorldRotation = (mesh: AbstractMesh): Quaternion => {
  const scale = new Vector3();
  const rotation = Quaternion.Identity();
  const translation = new Vector3();
  mesh.getWorldMatrix().decompose(scale, rotation, translation);
  return rotation;
};

const createHologramMaterial = (
  scene: Scene,
  name: string,
  color: Color3,
  alpha: number,
): StandardMaterial => {
  const material = new StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = color;
  material.alpha = alpha;
  material.backFaceCulling = false;
  return material;
};

const laneAccent = (lane: DrumLane): { core: Color3; ring: Color3; halo: Color3 } => {
  switch (lane) {
    case DrumLane.Kick:
      return {
        core: new Color3(1, 0.45, 0.1),
        ring: new Color3(1, 0.55, 0.2),
        halo: new Color3(1, 0.35, 0.05),
      };
    case DrumLane.Red:
      return {
        core: new Color3(1, 0.2, 0.2),
        ring: new Color3(1, 0.45, 0.45),
        halo: new Color3(1, 0.35, 0.5),
      };
    case DrumLane.Yellow:
      return {
        core: new Color3(1, 0.92, 0.2),
        ring: new Color3(1, 0.98, 0.55),
        halo: new Color3(1, 0.75, 0.2),
      };
    case DrumLane.Blue:
      return {
        core: new Color3(0.2, 0.55, 1),
        ring: new Color3(0.45, 0.75, 1),
        halo: new Color3(0.55, 0.35, 1),
      };
    case DrumLane.Green:
    default:
      return {
        core: new Color3(0.2, 0.9, 0.35),
        ring: new Color3(0.45, 1, 0.55),
        halo: new Color3(0.35, 1, 0.65),
      };
  }
};

const CYL_TESS = 18;
const TORUS_TESS = 24;

class HologramNoteVisual implements RhythmNoteVisual {
  private readonly core: AbstractMesh;
  private readonly ring: AbstractMesh;
  private readonly halo: AbstractMesh;
  private readonly coreMaterial: StandardMaterial;
  private readonly ringMaterial: StandardMaterial;
  private readonly haloMaterial: StandardMaterial;
  private readonly startPosition: Vector3;
  private readonly targetPosition: Vector3;
  private readonly baseScale: number;
  private readonly wobbleAxis: Vector3;
  private readonly verticalDrop: number;
  private readonly accent: { core: Color3; ring: Color3; halo: Color3 };

  constructor(scene: Scene, targetMesh: AbstractMesh, lane: DrumLane) {
    const center = targetMesh.getBoundingInfo().boundingSphere.centerWorld.clone();
    const rotation = getMeshWorldRotation(targetMesh);
    const radius = targetMesh.getBoundingInfo().boundingSphere.radiusWorld;
    this.baseScale = Math.max(0.14, radius * 0.42);
    this.verticalDrop = Math.max(1.45, radius * 2.8);
    this.wobbleAxis = new Vector3(0, 1, 0);
    this.accent = laneAccent(lane);

    this.targetPosition = center;
    this.startPosition = center.add(new Vector3(0, this.verticalDrop, 0));

    this.core = MeshBuilder.CreateCylinder(
      `holoCore_${targetMesh.uniqueId}_${Date.now()}`,
      { height: 0.028, diameter: 1, tessellation: CYL_TESS },
      scene,
    );
    this.ring = MeshBuilder.CreateTorus(
      `holoRing_${targetMesh.uniqueId}_${Date.now()}`,
      { diameter: 1.06, thickness: 0.024, tessellation: TORUS_TESS },
      scene,
    );
    this.halo = MeshBuilder.CreateTorus(
      `holoHalo_${targetMesh.uniqueId}_${Date.now()}`,
      { diameter: 1.14, thickness: 0.01, tessellation: TORUS_TESS },
      scene,
    );

    this.coreMaterial = createHologramMaterial(
      scene,
      `holoCoreMat_${targetMesh.uniqueId}_${Date.now()}`,
      this.accent.core,
      0.36,
    );
    this.ringMaterial = createHologramMaterial(
      scene,
      `holoRingMat_${targetMesh.uniqueId}_${Date.now()}`,
      this.accent.ring,
      0.42,
    );
    this.haloMaterial = createHologramMaterial(
      scene,
      `holoHaloMat_${targetMesh.uniqueId}_${Date.now()}`,
      this.accent.halo,
      0.16,
    );

    this.core.material = this.coreMaterial;
    this.ring.material = this.ringMaterial;
    this.halo.material = this.haloMaterial;

    this.core.isPickable = false;
    this.ring.isPickable = false;
    this.halo.isPickable = false;
    this.core.rotationQuaternion = rotation.clone();
    this.ring.rotationQuaternion = rotation.clone();
    this.halo.rotationQuaternion = rotation.clone();
  }

  public update(songTimeMs: number, noteTimeMs: number, leadTimeMs: number): void {
    const spawnTime = noteTimeMs - leadTimeMs;
    const progress = Math.min(1, Math.max(0, (songTimeMs - spawnTime) / leadTimeMs));
    const eased = Math.pow(progress, 0.88);
    const pos = Vector3.Lerp(this.startPosition, this.targetPosition, eased);
    const pulse = 0.985 + Math.sin(progress * Math.PI * 5) * 0.015;
    const scale = this.baseScale * pulse;
    const orbit = Math.sin(progress * Math.PI * 3.8) * 0.028 * this.baseScale;
    const wobbleOffset = this.wobbleAxis.scale(0);
    wobbleOffset.x = orbit;
    wobbleOffset.z = orbit * 0.65;

    this.core.position.copyFrom(pos.add(wobbleOffset));
    this.ring.position.copyFrom(this.core.position);
    this.halo.position.copyFrom(this.core.position);
    this.core.scaling.set(scale, scale, scale);
    this.ring.scaling.set(scale * 1.06, scale * 1.06, scale * 1.06);
    this.halo.scaling.set(scale * 1.12, scale * 1.12, scale * 1.12);

    const a = this.accent;
    this.coreMaterial.emissiveColor = Color3.Lerp(a.core, new Color3(0.2, 1, 0.46), progress);
    this.ringMaterial.emissiveColor = Color3.Lerp(a.ring, new Color3(0.44, 1, 0.62), progress);
    this.haloMaterial.emissiveColor = Color3.Lerp(a.halo, new Color3(0.38, 0.95, 0.62), progress);
    this.coreMaterial.alpha = 0.3 + (1 - progress) * 0.12;
    this.ringMaterial.alpha = 0.24 + (1 - progress) * 0.12;
    this.haloMaterial.alpha = 0.08 + (1 - progress) * 0.08;
  }

  public markHit(): void {
    this.coreMaterial.emissiveColor = new Color3(0.2, 1, 0.45);
    this.ringMaterial.emissiveColor = new Color3(0.3, 1, 0.56);
    this.haloMaterial.emissiveColor = new Color3(0.5, 1, 0.62);
    this.coreMaterial.alpha = 0.78;
    this.ringMaterial.alpha = 0.72;
    this.haloMaterial.alpha = 0.5;
  }

  public dispose(): void {
    this.core.dispose();
    this.ring.dispose();
    this.halo.dispose();
    this.coreMaterial.dispose();
    this.ringMaterial.dispose();
    this.haloMaterial.dispose();
  }
}

export class HologramLaneNoteVisualizer {
  private readonly scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public create(targetMesh: AbstractMesh, lane: DrumLane): RhythmNoteVisual {
    return new HologramNoteVisual(this.scene, targetMesh, lane);
  }
}
