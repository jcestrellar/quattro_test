/**
 * Modo concierto con rig de luces de color (show).
 * 8 luces máx. en shader (hemi + dir + 6 spots) para no superar GL_MAX_VERTEX_UNIFORM_BUFFERS (12).
 */
export const CONCERT_SHOW_PERF = {
  hardwareScalingLevel: 1.25,
  enableCartoonPostProcess: false,
  shadowMapSize: 1024,
  usePcfShadow: false,
  shadowCasterNamePattern: /Bass|Lid|Cymbal|bass|snare|tom|crash|ride|hi.?hat|Hat|Kick|kick|drum/i,
  maxSimultaneousLights: 8,
  glowBlurKernel: 12,
  maxSparks: 12,
} as const;
