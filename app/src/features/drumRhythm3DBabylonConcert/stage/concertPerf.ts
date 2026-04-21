/**
 * Ajustes de rendimiento del modo escenario 3D (concierto).
 * El post-proceso cartoon y sombras grandes son los mayores costes en GPU.
 */
export const CONCERT_PERF = {
  /** Mayor que 1 reduce resolución interna (mejor FPS, algo más borroso). */
  hardwareScalingLevel: 1.25,
  /** Post-proceso estilo cómic: muy costoso; desactivado por defecto. */
  enableCartoonPostProcess: false,
  /** Mapa de sombras direccionales (px). */
  shadowMapSize: 1024,
  /** PCF es más suave pero más caro que el mapa básico. */
  usePcfShadow: false,
  /** Focos “concierto” volumétricos: 1 basta y ahorra draw calls. */
  whiteRigCount: 1 as 1 | 2,
  /** Conos de haz visibles (mallas alpha): desactivar ahorra mucho en escenas grandes. */
  showBeamMeshes: false,
  /** Solo estas mallas proyectan sombra (evita miles de casters en Stage.glb). */
  shadowCasterNamePattern: /Bass|Lid|Cymbal|bass|snare|tom|crash|ride|hi.?hat|Hat|Kick|kick|drum/i,
  /** Máx. luces por material (shader más barato). */
  maxSimultaneousLights: 6,
  /** GlowLayer blur en VFX de golpe. */
  glowBlurKernel: 12,
  /** Chispas por golpe (aprox.). */
  maxSparks: 12,
} as const;
