import { AbstractMesh, Vector3 } from '@babylonjs/core';
import type { DrumLane } from '../../drumRhythm/drumPadMap';

const PULSE_MS = 240;

/**
 * Pulso de escala + ligero brillo en el pad/plato del GLB al golpear (estilo RB).
 */
export class DrumKitHitReaction {
  private readonly anchors: Map<DrumLane, AbstractMesh>;
  private readonly baseScale = new Map<DrumLane, Vector3>();
  private readonly pulseUntil = new Map<DrumLane, number>();

  constructor(anchors: Map<DrumLane, AbstractMesh>) {
    this.anchors = anchors;

    for (const [lane, mesh] of anchors) {
      this.baseScale.set(lane, mesh.scaling.clone());
      try {
        mesh.unfreezeWorldMatrix();
      } catch {
        /* noop */
      }
    }
  }

  trigger(lane: DrumLane): void {
    this.pulseUntil.set(lane, performance.now() + PULSE_MS);
  }

  tick(): void {
    const now = performance.now();

    for (const lane of this.baseScale.keys()) {
      const mesh = this.anchors.get(lane);
      const base = this.baseScale.get(lane);
      const until = this.pulseUntil.get(lane);
      if (!mesh || !base || until === undefined) continue;

      if (now >= until) {
        mesh.scaling.copyFrom(base);
        this.pulseUntil.delete(lane);
        continue;
      }

      const t = 1 - (until - now) / PULSE_MS;
      const ease = Math.sin(t * Math.PI);
      const bump = 1 + 0.13 * ease;
      mesh.scaling.set(base.x * bump, base.y * bump, base.z * bump);
    }
  }

  dispose(): void {
    for (const lane of this.baseScale.keys()) {
      const mesh = this.anchors.get(lane);
      const base = this.baseScale.get(lane);
      if (mesh && base) mesh.scaling.copyFrom(base);
    }
    this.pulseUntil.clear();
  }
}
