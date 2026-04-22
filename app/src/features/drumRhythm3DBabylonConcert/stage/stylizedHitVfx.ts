import {
  AbstractMesh,
  Color3,
  DynamicTexture,
  GlowLayer,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type HitVfxKind = 'neutral' | 'perfect' | 'good' | 'early';

export interface HitVfxPlayer {
  triggerHit: (targetMesh: AbstractMesh, kind?: HitVfxKind) => void;
  dispose: () => void;
}

export interface StylizedHitVfxOptions {
  glowBlurKernel: number;
  maxSparks: number;
}

const resolveVfxColor = (kind: HitVfxKind): Color3 => {
  switch (kind) {
    case 'perfect':
      return new Color3(0.2, 1, 0.45);
    case 'good':
      return new Color3(0.45, 0.95, 1);
    case 'early':
      return new Color3(1, 0.72, 0.24);
    case 'neutral':
    default:
      return new Color3(1, 0.28, 0.16);
  }
};

const resolveIntensity = (kind: HitVfxKind): number => {
  switch (kind) {
    case 'perfect':
      return 1;
    case 'good':
      return 0.85;
    case 'early':
      return 0.75;
    case 'neutral':
    default:
      return 0.65;
  }
};

export class StylizedHitVfx implements HitVfxPlayer {
  private readonly scene: Scene;
  private readonly glowLayer: GlowLayer;
  private readonly perfectTextTexture: DynamicTexture;
  private readonly maxSparks: number;

  constructor(scene: Scene, options: StylizedHitVfxOptions) {
    this.scene = scene;
    this.maxSparks = options.maxSparks;
    this.glowLayer = new GlowLayer('stylizedHitGlow', scene, {
      blurKernelSize: options.glowBlurKernel,
    });
    this.glowLayer.intensity = 0.5;
    this.perfectTextTexture = this.createPerfectTextTexture();
  }

  public triggerHit(targetMesh: AbstractMesh, kind: HitVfxKind = 'neutral'): void {
    const center = targetMesh.getBoundingInfo().boundingSphere.centerWorld.clone();
    const radius = Math.max(0.08, targetMesh.getBoundingInfo().boundingSphere.radiusWorld * 0.28);
    const color = resolveVfxColor(kind);
    const intensity = resolveIntensity(kind);

    this.spawnSparkBurst(targetMesh, center, color, intensity, radius);
    if (kind === 'perfect') {
      this.spawnComicOnomatopoeia(center, color, radius);
    }

    const light = new PointLight(`hitVfxLight_${targetMesh.uniqueId}_${Date.now()}`, center, this.scene);
    light.diffuse = color;
    light.intensity = 10 * intensity;
    light.range = radius * 8;

    const startTime = performance.now();
    const durationMs = 180;

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min(1, (performance.now() - startTime) / durationMs);
      light.intensity = (1 - progress) * 10 * intensity;

      if (progress < 1) {
        return;
      }

      this.scene.onBeforeRenderObservable.remove(observer);
      light.dispose();
    });
  }

  private spawnSparkBurst(
    targetMesh: AbstractMesh,
    center: Vector3,
    color: Color3,
    intensity: number,
    radius: number,
  ): void {
    const sparkCount = Math.min(
      this.maxSparks,
      Math.max(4, Math.round(6 + 4 * intensity)),
    );
    const sparks: Array<{
      mesh: Mesh;
      material: StandardMaterial;
      velocity: Vector3;
      startScale: number;
    }> = [];

    for (let i = 0; i < sparkCount; i++) {
      const spark = MeshBuilder.CreateSphere(
        `hitSpark_${targetMesh.uniqueId}_${Date.now()}_${i}`,
        { diameter: radius * 0.26, segments: 3 },
        this.scene,
      );
      spark.isPickable = false;
      spark.position.copyFrom(center);

      const sparkMaterial = new StandardMaterial(
        `hitSparkMat_${targetMesh.uniqueId}_${Date.now()}_${i}`,
        this.scene,
      );
      sparkMaterial.disableLighting = true;
      sparkMaterial.emissiveColor = color.scale(1.1);
      sparkMaterial.alpha = 0.86;
      sparkMaterial.backFaceCulling = false;
      spark.material = sparkMaterial;

      this.glowLayer.addIncludedOnlyMesh(spark);

      const direction = new Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.3,
        Math.random() * 2 - 1,
      ).normalize();
      const speed = radius * (2.3 + Math.random() * 3.4) * (0.8 + intensity * 0.45);
      sparks.push({
        mesh: spark,
        material: sparkMaterial,
        velocity: direction.scale(speed),
        startScale: spark.scaling.x,
      });
    }

    const startTime = performance.now();
    const durationMs = 220;
    const gravity = -0.0016;

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const elapsedMs = performance.now() - startTime;
      const progress = Math.min(1, elapsedMs / durationMs);
      const delta = this.scene.getEngine().getDeltaTime();

      for (const spark of sparks) {
        spark.velocity.y += gravity * delta;
        spark.mesh.position.addInPlace(spark.velocity.scale(delta * 0.001));

        const scale = spark.startScale * (1 - progress * 0.65);
        spark.mesh.scaling.set(scale, scale, scale);
        spark.material.alpha = (1 - progress) * 0.9;
      }

      if (progress < 1) {
        return;
      }

      this.scene.onBeforeRenderObservable.remove(observer);
      for (const spark of sparks) {
        this.glowLayer.removeIncludedOnlyMesh(spark.mesh);
        spark.mesh.dispose();
        spark.material.dispose();
      }
    });
  }

  private createPerfectTextTexture(): DynamicTexture {
    const texture = new DynamicTexture('perfectTextTexture', { width: 512, height: 128 }, this.scene, true);
    texture.hasAlpha = true;
    const text = 'PERFECT';
    const font = 'bold 90px Impact';
    const x = 256;
    const y = 92;
    const outlineOffsets = [
      [-4, 0],
      [4, 0],
      [0, -4],
      [0, 4],
    ];

    for (const [ox, oy] of outlineOffsets) {
      texture.drawText(text, x + ox, y + oy, font, '#000000', 'transparent', true);
    }
    texture.drawText(text, x, y, font, '#ffe6c7', 'transparent', true);
    texture.update();
    return texture;
  }

  private spawnComicOnomatopoeia(center: Vector3, color: Color3, radius: number): void {
    const plane = MeshBuilder.CreatePlane(`comicText_${Date.now()}`, { width: 1.18, height: 0.36 }, this.scene);
    plane.billboardMode = AbstractMesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    const towardCamera = this.scene.activeCamera
      ? this.scene.activeCamera.globalPosition.subtract(center).normalize().scale(0.08 + radius * 0.22)
      : Vector3.Zero();
    plane.position.copyFrom(center.add(new Vector3(0, Math.max(0.2, radius * 0.75), 0)).add(towardCamera));

    const material = new StandardMaterial(`comicTextMat_${Date.now()}`, this.scene);
    material.disableLighting = true;
    material.emissiveColor = color.scale(0.55);
    material.opacityTexture = this.perfectTextTexture;
    material.diffuseTexture = this.perfectTextTexture;
    material.alpha = 0.92;
    material.backFaceCulling = false;
    plane.material = material;

    const startScale = plane.scaling.clone();
    const startPos = plane.position.clone();
    const startRotationZ = plane.rotation.z;
    const startTime = performance.now();
    const durationMs = 520;

    const observer = this.scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min(1, (performance.now() - startTime) / durationMs);
      const pop = Math.sin(progress * Math.PI);
      const squashX = 1 + pop * 0.14;
      const squashY = 1 - pop * 0.1;
      plane.scaling.set(startScale.x * squashX, startScale.y * squashY, startScale.z);
      plane.rotation.z = startRotationZ + Math.sin(progress * Math.PI * 2.2) * 0.08;
      plane.position.y = startPos.y + progress * 0.28;
      material.alpha = (1 - progress) * 0.95;

      if (progress < 1) {
        return;
      }

      this.scene.onBeforeRenderObservable.remove(observer);
      plane.dispose();
      material.dispose();
    });
  }

  public dispose(): void {
    this.glowLayer.dispose();
    this.perfectTextTexture.dispose();
  }
}
