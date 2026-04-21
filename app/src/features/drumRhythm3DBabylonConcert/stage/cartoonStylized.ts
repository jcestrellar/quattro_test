import { Camera, Effect, PostProcess, Scene } from '@babylonjs/core';

const SHADER_NAME = 'cartoonStylizedPostProcess';

const ensureShader = (): void => {
  const fragmentKey = `${SHADER_NAME}FragmentShader`;
  if (Effect.ShadersStore[fragmentKey]) {
    return;
  }

  Effect.ShadersStore[fragmentKey] = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform float edgeThreshold;
    uniform float colorLevels;
    uniform float outlineStrength;
    uniform float stylizeStrength;
    uniform float grimeStrength;
    uniform float screenWidth;
    uniform float screenHeight;

    float luminance(vec3 color) {
      return dot(color, vec3(0.299, 0.587, 0.114));
    }

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main(void) {
      vec2 texel = vec2(1.0 / screenWidth, 1.0 / screenHeight);
      vec4 baseColor = texture2D(textureSampler, vUV);

      vec3 rightColor = texture2D(textureSampler, vUV + vec2(texel.x, 0.0)).rgb;
      vec3 leftColor = texture2D(textureSampler, vUV - vec2(texel.x, 0.0)).rgb;
      vec3 upColor = texture2D(textureSampler, vUV + vec2(0.0, texel.y)).rgb;
      vec3 downColor = texture2D(textureSampler, vUV - vec2(0.0, texel.y)).rgb;

      float gx = abs(luminance(rightColor) - luminance(leftColor));
      float gy = abs(luminance(upColor) - luminance(downColor));
      float edge = gx + gy;
      float edgeMask = smoothstep(edgeThreshold, edgeThreshold * 2.3, edge);

      vec3 quantized = floor(baseColor.rgb * colorLevels) / max(colorLevels - 1.0, 1.0);
      vec3 stylized = mix(baseColor.rgb, quantized, stylizeStrength);
      vec3 outlined = mix(stylized, vec3(0.02, 0.02, 0.03), edgeMask * outlineStrength);

      float dirt = hash(vUV * vec2(screenWidth, screenHeight) * 0.08);
      float grimeMask = smoothstep(0.78, 1.0, dirt) * grimeStrength;
      vec3 grimed = mix(outlined, outlined * vec3(0.72, 0.68, 0.6), grimeMask);

      gl_FragColor = vec4(grimed, baseColor.a);
    }
  `;
};

export const applyCartoonStylized = (scene: Scene, camera: Camera): PostProcess => {
  ensureShader();

  const postProcess = new PostProcess(
    'cartoonStylized',
    SHADER_NAME,
    [
      'edgeThreshold',
      'colorLevels',
      'outlineStrength',
      'stylizeStrength',
      'grimeStrength',
      'screenWidth',
      'screenHeight',
    ],
    null,
    1,
    camera,
  );

  postProcess.onApply = (effect) => {
    effect.setFloat('edgeThreshold', 0.18);
    effect.setFloat('colorLevels', 10);
    effect.setFloat('outlineStrength', 0.35);
    effect.setFloat('stylizeStrength', 0.46);
    effect.setFloat('grimeStrength', 0.06);
    effect.setFloat('screenWidth', scene.getEngine().getRenderWidth());
    effect.setFloat('screenHeight', scene.getEngine().getRenderHeight());
  };

  return postProcess;
};
