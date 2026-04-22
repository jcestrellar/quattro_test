import { SystemDevice } from '../../../functions/systemDevice';

const mob = SystemDevice.isMobile;

/**
 * Modo concierto con rig de luces de color (show).
 * En móvil: menos píxeles, sombras más baratas, sin haces volumétricos alpha,
 * actualización de luces a stride > 1, highway con menos partículas.
 */
export const CONCERT_SHOW_PERF = {
  hardwareScalingLevel: mob ? 2.0 : 1.25,
  enableCartoonPostProcess: false,
  shadowMapSize: mob ? 512 : 1024,
  shadowCheapPass: mob,
  usePcfShadow: false,
  shadowCasterNamePattern: /Bass|Lid|Cymbal|bass|snare|tom|crash|ride|hi.?hat|Hat|Kick|kick|drum/i,
  maxSimultaneousLights: mob ? 6 : 8,
  glowBlurKernel: mob ? 4 : 12,
  maxSparks: mob ? 5 : 12,
  /** Cilindros alpha animados (muy caros en fill-rate móvil). */
  enableVolumetricBeams: !mob,
  /** Actualizar rig de luces cada N frames (1 = cada frame). */
  lightUpdateStride: mob ? 2 : 1,
  highwayAmbientParticles: mob ? 100 : 220,
  highwayAmbientEmitRate: mob ? 12 : 28,
  highwayBurstParticles: mob ? 14 : 22,
} as const;
