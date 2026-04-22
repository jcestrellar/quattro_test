import { SystemDevice } from '../../../functions/systemDevice';

const mob = SystemDevice.isMobile;

/**
 * Ajustes de rendimiento del modo escenario 3D (concierto).
 * En móvil se reduce resolución interna, sombras, VFX y partículas del highway
 * para limitar calor, throttling (~15 fps) y consumo de batería.
 */
export const CONCERT_PERF = {
  /** >1 reduce píxeles renderizados (clave en iPad / Android retina). */
  hardwareScalingLevel: mob ? 1.95 : 1.25,
  /** Post-proceso estilo cómic: muy costoso; desactivado por defecto. */
  enableCartoonPostProcess: false,
  /** Mapa de sombras direccionales (px). */
  shadowMapSize: mob ? 512 : 1024,
  /** Sombras sin blur exponencial: más baratas en tile-based GPUs móviles. */
  shadowCheapPass: mob,
  /** PCF es más suave pero más caro que el mapa básico. */
  usePcfShadow: false,
  /** Focos “concierto” volumétricos: 1 basta y ahorra draw calls. */
  whiteRigCount: 1 as 1 | 2,
  /** Conos de haz visibles (mallas alpha): desactivar ahorra mucho en escenas grandes. */
  showBeamMeshes: false,
  /** Solo estas mallas proyectan sombra (evita miles de casters en Stage.glb). */
  shadowCasterNamePattern: /Bass|Lid|Cymbal|bass|snare|tom|crash|ride|hi.?hat|Hat|Kick|kick|drum/i,
  /** Máx. luces por material (shader más barato). */
  maxSimultaneousLights: mob ? 4 : 6,
  /** GlowLayer blur en VFX de golpe (pantalla completa cada frame). */
  glowBlurKernel: mob ? 4 : 12,
  /** Chispas por golpe (aprox.). */
  maxSparks: mob ? 5 : 12,
  /** Partículas ambiente del highway (`ghAmbient`). */
  highwayAmbientParticles: mob ? 100 : 220,
  highwayAmbientEmitRate: mob ? 12 : 28,
  highwayBurstParticles: mob ? 14 : 22,
} as const;
