var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/src/scripts.ts
var scripts_exports = {};
__export(scripts_exports, {
  _applyScriptsForObject: () => _applyScriptsForObject,
  _preloadScriptsAssets: () => _preloadScriptsAssets,
  _removeRegisteredScriptInstance: () => _removeRegisteredScriptInstance,
  loadScene: () => loadScene,
  scriptAssetsCache: () => scriptAssetsCache,
  scriptsDictionary: () => scriptsDictionary,
  scriptsMap: () => scriptsMap
});
module.exports = __toCommonJS(scripts_exports);

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/loader.js
var import_babylonjs47 = require("babylonjs");
var import_babylonjs48 = require("babylonjs");
var import_babylonjs49 = require("babylonjs");
var import_babylonjs50 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/guards.js
function isAbstractMesh(object) {
  switch (object.getClassName?.()) {
    case "Mesh":
    case "LineMesh":
    case "GroundMesh":
    case "InstancedMesh":
      return true;
  }
  return false;
}
__name(isAbstractMesh, "isAbstractMesh");
function isMesh(object) {
  switch (object.getClassName?.()) {
    case "Mesh":
    case "GroundMesh":
      return true;
  }
  return false;
}
__name(isMesh, "isMesh");
function isInstancedMesh(object) {
  return object.getClassName?.() === "InstancedMesh";
}
__name(isInstancedMesh, "isInstancedMesh");
function isTransformNode(object) {
  return object.getClassName?.() === "TransformNode";
}
__name(isTransformNode, "isTransformNode");
function isTexture(object) {
  return object?.getClassName?.() === "Texture";
}
__name(isTexture, "isTexture");
function isCamera(object) {
  switch (object.getClassName?.()) {
    case "Camera":
    case "FreeCamera":
    case "TargetCamera":
    case "EditorCamera":
    case "ArcRotateCamera":
    case "UniversalCamera":
      return true;
  }
  return false;
}
__name(isCamera, "isCamera");
function isLight(object) {
  switch (object.getClassName?.()) {
    case "Light":
    case "PointLight":
    case "SpotLight":
    case "DirectionalLight":
    case "HemisphericLight":
      return true;
  }
  return false;
}
__name(isLight, "isLight");
function isNode(object) {
  return isAbstractMesh(object) || isTransformNode(object) || isLight(object) || isCamera(object);
}
__name(isNode, "isNode");
function isScene(object) {
  return object.getClassName?.() === "Scene";
}
__name(isScene, "isScene");
function isParticleSystem(object) {
  return object.getClassName?.() === "ParticleSystem";
}
__name(isParticleSystem, "isParticleSystem");
function isAnyParticleSystem(object) {
  switch (object.getClassName?.()) {
    case "ParticleSystem":
    case "GPUParticleSystem":
      return true;
  }
  return false;
}
__name(isAnyParticleSystem, "isAnyParticleSystem");
function isSprite(object) {
  return object.getClassName?.() === "Sprite";
}
__name(isSprite, "isSprite");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/light.js
var import_babylonjs = require("babylonjs");
var import_babylonjs2 = require("babylonjs");
function configureShadowMapRenderListPredicate(scene) {
  scene.lights.forEach((light) => {
    const shadowMap = light.getShadowGenerator()?.getShadowMap();
    if (!shadowMap) {
      return;
    }
    shadowMap.renderListPredicate = (mesh) => {
      const distance = import_babylonjs.Vector3.Distance(mesh.getAbsolutePosition(), light.getAbsolutePosition());
      return distance <= light.range;
    };
  });
}
__name(configureShadowMapRenderListPredicate, "configureShadowMapRenderListPredicate");
async function configureShadowMapRefreshRate(scene) {
  scene.executeWhenReady(() => {
    scene.lights.forEach((light) => {
      const shadowMap = light.getShadowGenerator()?.getShadowMap();
      if (shadowMap) {
        shadowMap.refreshRate = light.metadata?.refreshRate ?? import_babylonjs2.RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
      }
    });
  });
}
__name(configureShadowMapRefreshRate, "configureShadowMapRefreshRate");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/vls.js
var import_babylonjs3 = require("babylonjs");
var import_babylonjs4 = require("babylonjs");
var import_babylonjs5 = require("babylonjs");
var vlsPostProcess = null;
var vlsPostProcessCameraConfigurations = /* @__PURE__ */ new Map();
function disposeVLSPostProcess(scene) {
  if (vlsPostProcess && scene.activeCamera) {
    vlsPostProcess.dispose(scene.activeCamera);
    vlsPostProcess = null;
  }
}
__name(disposeVLSPostProcess, "disposeVLSPostProcess");
function createVLSPostProcess(scene, mesh) {
  mesh ??= scene.meshes.find((mesh2) => isMesh(mesh2));
  vlsPostProcess = new import_babylonjs5.VolumetricLightScatteringPostProcess("VolumetricLightScatteringPostProcess", 1, scene.activeCamera, mesh, 100, import_babylonjs4.Texture.BILINEAR_SAMPLINGMODE, scene.getEngine(), false);
  return vlsPostProcess;
}
__name(createVLSPostProcess, "createVLSPostProcess");
function parseVLSPostProcess(scene, data) {
  let mesh = null;
  if (data.meshId) {
    const result = scene.getMeshById(data.meshId);
    if (result && isMesh(result)) {
      mesh = result;
    }
  }
  const vlsPostProcess2 = createVLSPostProcess(scene, mesh);
  vlsPostProcess2.exposure = data.exposure;
  vlsPostProcess2.decay = data.decay;
  vlsPostProcess2.weight = data.weight;
  vlsPostProcess2.density = data.density;
  vlsPostProcess2.invert = data.invert;
  vlsPostProcess2.useCustomMeshPosition = data.useCustomMeshPosition;
  vlsPostProcess2.customMeshPosition.copyFrom(import_babylonjs3.Vector3.FromArray(data.customMeshPosition));
  return vlsPostProcess2;
}
__name(parseVLSPostProcess, "parseVLSPostProcess");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/ssr.js
var import_babylonjs6 = require("babylonjs");
var ssrRenderingPipeline = null;
var ssrRenderingPipelineCameraConfigurations = /* @__PURE__ */ new Map();
function disposeSSRRenderingPipeline() {
  if (ssrRenderingPipeline) {
    ssrRenderingPipeline.dispose();
    ssrRenderingPipeline = null;
  }
}
__name(disposeSSRRenderingPipeline, "disposeSSRRenderingPipeline");
function createSSRRenderingPipeline(scene, camera) {
  ssrRenderingPipeline = new import_babylonjs6.SSRRenderingPipeline("SSRRenderingPipeline", scene, [camera]);
  ssrRenderingPipeline.samples = 4;
  return ssrRenderingPipeline;
}
__name(createSSRRenderingPipeline, "createSSRRenderingPipeline");
function parseSSRRenderingPipeline(scene, camera, data) {
  if (ssrRenderingPipeline) {
    return ssrRenderingPipeline;
  }
  const pipeline = createSSRRenderingPipeline(scene, camera);
  pipeline.samples = data.samples;
  pipeline.step = data.step;
  pipeline.thickness = data.thickness;
  pipeline.strength = data.strength;
  pipeline.reflectionSpecularFalloffExponent = data.reflectionSpecularFalloffExponent;
  pipeline.maxSteps = data.maxSteps;
  pipeline.maxDistance = data.maxDistance;
  pipeline.roughnessFactor = data.roughnessFactor;
  pipeline.reflectivityThreshold = data.reflectivityThreshold;
  pipeline.blurDispersionStrength = data.blurDispersionStrehgth;
  pipeline.clipToFrustum = data.clipToFrustum;
  pipeline.enableSmoothReflections = data.enableSmoothReflections;
  pipeline.enableAutomaticThicknessComputation = data.enableAutomaticThicknessComputation;
  pipeline.attenuateFacingCamera = data.attenuateFacingCamera;
  pipeline.attenuateScreenBorders = data.attenuateScreenBorders;
  pipeline.attenuateIntersectionDistance = data.attenuateIntersectionDistance;
  pipeline.attenuateBackfaceReflection = data.attenuateBackfaceReflection;
  pipeline.blurDownsample = data.blurDownsample;
  pipeline.selfCollisionNumSkip = data.selfCollisionNumSkip;
  pipeline.ssrDownsample = data.ssrDownsample;
  pipeline.backfaceDepthTextureDownsample = data.backfaceDepthTextureDownsample;
  return pipeline;
}
__name(parseSSRRenderingPipeline, "parseSSRRenderingPipeline");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/taa.js
var import_babylonjs7 = require("babylonjs");
var taaRenderingPipeline = null;
var taaRenderingPipelineCameraConfigurations = /* @__PURE__ */ new Map();
function disposeTAARenderingPipeline() {
  if (taaRenderingPipeline) {
    taaRenderingPipeline.dispose();
    taaRenderingPipeline = null;
  }
}
__name(disposeTAARenderingPipeline, "disposeTAARenderingPipeline");
function createTAARenderingPipeline(scene, camera) {
  taaRenderingPipeline = new import_babylonjs7.TAARenderingPipeline("TAARenderingPipeline", scene, [camera]);
  taaRenderingPipeline.samples = 4;
  return taaRenderingPipeline;
}
__name(createTAARenderingPipeline, "createTAARenderingPipeline");
function parseTAARenderingPipeline(scene, camera, data) {
  if (taaRenderingPipeline) {
    return taaRenderingPipeline;
  }
  const pipeline = createTAARenderingPipeline(scene, camera);
  pipeline.factor = data.factor;
  pipeline.samples = data.samples;
  pipeline.clampHistory = data.clampHistory;
  pipeline.reprojectHistory = data.reprojectHistory;
  pipeline.disableOnCameraMove = data.disableOnCameraMove;
  return pipeline;
}
__name(parseTAARenderingPipeline, "parseTAARenderingPipeline");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/ssao.js
var import_babylonjs8 = require("babylonjs");
var ssaoRenderingPipeline = null;
var ssaoRenderingPipelineCameraConfigurations = /* @__PURE__ */ new Map();
function disposeSSAO2RenderingPipeline() {
  if (ssaoRenderingPipeline) {
    ssaoRenderingPipeline.dispose();
    ssaoRenderingPipeline = null;
  }
}
__name(disposeSSAO2RenderingPipeline, "disposeSSAO2RenderingPipeline");
function createSSAO2RenderingPipeline(scene, camera) {
  ssaoRenderingPipeline = new import_babylonjs8.SSAO2RenderingPipeline("SSAO2RenderingPipeline", scene, 1, [camera]);
  ssaoRenderingPipeline.samples = 4;
  return ssaoRenderingPipeline;
}
__name(createSSAO2RenderingPipeline, "createSSAO2RenderingPipeline");
function parseSSAO2RenderingPipeline(scene, camera, data) {
  if (ssaoRenderingPipeline) {
    return ssaoRenderingPipeline;
  }
  const pipeline = createSSAO2RenderingPipeline(scene, camera);
  pipeline.radius = data.radius;
  pipeline.totalStrength = data.totalStrength;
  pipeline.samples = data.samples;
  pipeline.maxZ = data.maxZ;
  pipeline.minZAspect = data.minZAspect;
  pipeline.epsilon = data.epsilon;
  pipeline.textureSamples = data.textureSamples;
  pipeline.bypassBlur = data.bypassBlur;
  pipeline.bilateralSamples = data.bilateralSamples;
  pipeline.bilateralSoften = data.bilateralSoften;
  pipeline.bilateralTolerance = data.bilateralTolerance;
  pipeline.expensiveBlur = data.expensiveBlur;
  return pipeline;
}
__name(parseSSAO2RenderingPipeline, "parseSSAO2RenderingPipeline");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/motion-blur.js
var import_babylonjs9 = require("babylonjs");
var motionBlurPostProcess = null;
var motionBlurPostProcessCameraConfigurations = /* @__PURE__ */ new Map();
function disposeMotionBlurPostProcess() {
  if (motionBlurPostProcess) {
    motionBlurPostProcess.dispose();
    motionBlurPostProcess = null;
  }
}
__name(disposeMotionBlurPostProcess, "disposeMotionBlurPostProcess");
function createMotionBlurPostProcess(scene, camera) {
  motionBlurPostProcess = new import_babylonjs9.MotionBlurPostProcess("MotionBlurPostProcess", scene, 1, camera);
  motionBlurPostProcess.motionStrength = 1;
  motionBlurPostProcess.isObjectBased = true;
  return motionBlurPostProcess;
}
__name(createMotionBlurPostProcess, "createMotionBlurPostProcess");
function parseMotionBlurPostProcess(scene, camera, data) {
  if (motionBlurPostProcess) {
    return motionBlurPostProcess;
  }
  const postProcess = createMotionBlurPostProcess(scene, camera);
  postProcess.isObjectBased = data.isObjectBased;
  postProcess.motionStrength = data.motionStrength;
  postProcess.motionBlurSamples = data.motionBlurSamples;
  return postProcess;
}
__name(parseMotionBlurPostProcess, "parseMotionBlurPostProcess");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/default-pipeline.js
var import_babylonjs10 = require("babylonjs");
var import_babylonjs11 = require("babylonjs");
var import_babylonjs12 = require("babylonjs");
var import_babylonjs13 = require("babylonjs");
var import_babylonjs14 = require("babylonjs");
var defaultRenderingPipeline = null;
var defaultPipelineCameraConfigurations = /* @__PURE__ */ new Map();
function disposeDefaultRenderingPipeline() {
  if (defaultRenderingPipeline) {
    defaultRenderingPipeline.dispose();
    defaultRenderingPipeline = null;
  }
}
__name(disposeDefaultRenderingPipeline, "disposeDefaultRenderingPipeline");
function createDefaultRenderingPipeline(scene, camera) {
  defaultRenderingPipeline = new import_babylonjs14.DefaultRenderingPipeline("DefaultRenderingPipeline", true, scene, [camera]);
  defaultRenderingPipeline.samples = 4;
  defaultRenderingPipeline.depthOfField.lensSize = 512;
  defaultRenderingPipeline.depthOfField.fStop = 0.25;
  defaultRenderingPipeline.depthOfField.focusDistance = 55e3;
  return defaultRenderingPipeline;
}
__name(createDefaultRenderingPipeline, "createDefaultRenderingPipeline");
function parseDefaultRenderingPipeline(scene, camera, data, rootUrl) {
  if (defaultRenderingPipeline) {
    return defaultRenderingPipeline;
  }
  const pipeline = createDefaultRenderingPipeline(scene, camera);
  pipeline.samples = data.samples;
  pipeline.fxaaEnabled = data.fxaaEnabled;
  pipeline.imageProcessingEnabled = data.imageProcessingEnabled;
  if (pipeline.imageProcessing) {
    pipeline.imageProcessing.exposure = data.exposure;
    pipeline.imageProcessing.contrast = data.contrast;
    pipeline.imageProcessing.fromLinearSpace = data.fromLinearSpace;
    pipeline.imageProcessing.toneMappingEnabled = data.toneMappingEnabled;
    pipeline.imageProcessing.toneMappingType = data.toneMappingType;
    pipeline.imageProcessing.ditheringEnabled = data.ditheringEnabled;
    pipeline.imageProcessing.ditheringIntensity = data.ditheringIntensity;
    pipeline.imageProcessing.vignetteEnabled = data.vignetteEnabled ?? false;
    pipeline.imageProcessing.vignetteColor = import_babylonjs10.Color4.FromArray(data.vignetteColor ?? [0, 0, 0]);
    pipeline.imageProcessing.vignetteWeight = data.vignetteWeight ?? 0.3;
    pipeline.imageProcessing.colorGradingEnabled = data.colorGradingEnabled ?? false;
    pipeline.imageProcessing.imageProcessingConfiguration.colorGradingWithGreenDepth = data.colorGradingWithGreenDepth ?? true;
    if (data.colorGradingTexture) {
      let texture = null;
      if (data.colorGradingTexture.customType === "BABYLON.ColorGradingTexture") {
        const absoluteUrl = rootUrl + data.colorGradingTexture.name;
        texture = new import_babylonjs13.ColorGradingTexture(absoluteUrl, scene);
        texture.level = data.colorGradingTexture.level;
      } else {
        const parsedTexture = import_babylonjs12.Texture.Parse(data.colorGradingTexture, scene, rootUrl);
        if (isTexture(parsedTexture)) {
          texture = parsedTexture;
        }
      }
      pipeline.imageProcessing.colorGradingTexture = texture;
    }
    pipeline.imageProcessing.colorCurvesEnabled = data.colorCurvesEnabled ?? false;
    if (pipeline.imageProcessing.colorCurves) {
      pipeline.imageProcessing.colorCurves.globalHue = data.globalHue ?? 30;
      pipeline.imageProcessing.colorCurves.globalDensity = data.globalDensity ?? 0;
      pipeline.imageProcessing.colorCurves.globalExposure = data.globalExposure ?? 0;
      pipeline.imageProcessing.colorCurves.globalSaturation = data.globalSaturation ?? 0;
      pipeline.imageProcessing.colorCurves.highlightsHue = data.highlightsHue ?? 30;
      pipeline.imageProcessing.colorCurves.highlightsDensity = data.highlightsDensity ?? 0;
      pipeline.imageProcessing.colorCurves.highlightsExposure = data.highlightsExposure ?? 0;
      pipeline.imageProcessing.colorCurves.highlightsSaturation = data.highlightsSaturation ?? 0;
      pipeline.imageProcessing.colorCurves.midtonesHue = data.midtonesHue ?? 30;
      pipeline.imageProcessing.colorCurves.midtonesDensity = data.midtonesDensity ?? 0;
      pipeline.imageProcessing.colorCurves.midtonesExposure = data.midtonesExposure ?? 0;
      pipeline.imageProcessing.colorCurves.midtonesSaturation = data.midtonesSaturation ?? 0;
      pipeline.imageProcessing.colorCurves.shadowsHue = data.shadowsHue ?? 30;
      pipeline.imageProcessing.colorCurves.shadowsDensity = data.shadowsDensity ?? 0;
      pipeline.imageProcessing.colorCurves.shadowsExposure = data.shadowsExposure ?? 0;
      pipeline.imageProcessing.colorCurves.shadowsSaturation = data.shadowsSaturation ?? 0;
    }
  }
  pipeline.bloomEnabled = data.bloomEnabled;
  pipeline.bloomThreshold = data.bloomThreshold;
  pipeline.bloomWeight = data.bloomWeight;
  pipeline.bloomScale = data.bloomScale;
  pipeline.bloomKernel = data.bloomKernel;
  pipeline.sharpenEnabled = data.sharpenEnabled;
  pipeline.sharpen.edgeAmount = data.sharpenEdgeAmount;
  pipeline.sharpen.colorAmount = data.sharpenColorAmount;
  pipeline.grainEnabled = data.grainEnabled;
  pipeline.grain.intensity = data.grainIntensity;
  pipeline.grain.animated = data.grainAnimated;
  pipeline.depthOfFieldEnabled = data.depthOfFieldEnabled;
  pipeline.depthOfFieldBlurLevel = data.depthOfFieldBlurLevel;
  pipeline.depthOfField.lensSize = data.lensSize;
  pipeline.depthOfField.fStop = data.fStop;
  pipeline.depthOfField.focusDistance = data.focusDistance;
  pipeline.depthOfField.focalLength = data.focalLength;
  pipeline.chromaticAberrationEnabled = data.chromaticAberrationEnabled ?? false;
  pipeline.chromaticAberration.aberrationAmount = data.aberrationAmount ?? 10;
  pipeline.chromaticAberration.radialIntensity = data.radialIntensity ?? 1;
  pipeline.chromaticAberration.direction = import_babylonjs11.Vector2.FromArray(data.direction ?? [0, 0]);
  pipeline.chromaticAberration.centerPosition = import_babylonjs11.Vector2.FromArray(data.centerPosition ?? [0, 0]);
  pipeline.glowLayerEnabled = data.glowLayerEnabled ?? false;
  if (pipeline.glowLayer) {
    pipeline.glowLayer.intensity = data.glowLayerIntensity ?? 1;
    pipeline.glowLayer.blurKernelSize = data.glowLayerBlurKernelSize ?? 32;
  }
  return pipeline;
}
__name(parseDefaultRenderingPipeline, "parseDefaultRenderingPipeline");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/rendering/tools.js
function applyRenderingConfigurationForCamera(camera, rootUrl) {
  disposeSSAO2RenderingPipeline();
  disposeVLSPostProcess(camera.getScene());
  disposeSSRRenderingPipeline();
  disposeMotionBlurPostProcess();
  disposeDefaultRenderingPipeline();
  disposeTAARenderingPipeline();
  const ssao2RenderingPipeline = ssaoRenderingPipelineCameraConfigurations.get(camera);
  if (ssao2RenderingPipeline) {
    parseSSAO2RenderingPipeline(camera.getScene(), camera, ssao2RenderingPipeline);
  }
  const vlsPostProcess2 = vlsPostProcessCameraConfigurations.get(camera);
  if (vlsPostProcess2) {
    parseVLSPostProcess(camera.getScene(), vlsPostProcess2);
  }
  const ssrRenderingPipeline2 = ssrRenderingPipelineCameraConfigurations.get(camera);
  if (ssrRenderingPipeline2) {
    parseSSRRenderingPipeline(camera.getScene(), camera, ssrRenderingPipeline2);
  }
  const motionBlurPostProcess2 = motionBlurPostProcessCameraConfigurations.get(camera);
  if (motionBlurPostProcess2) {
    parseMotionBlurPostProcess(camera.getScene(), camera, motionBlurPostProcess2);
  }
  const defaultRenderingPipeline2 = defaultPipelineCameraConfigurations.get(camera);
  if (defaultRenderingPipeline2) {
    parseDefaultRenderingPipeline(camera.getScene(), camera, defaultRenderingPipeline2, rootUrl);
  }
  const taaRenderingPipeline2 = taaRenderingPipelineCameraConfigurations.get(camera);
  if (taaRenderingPipeline2) {
    parseTAARenderingPipeline(camera.getScene(), camera, taaRenderingPipeline2);
  }
}
__name(applyRenderingConfigurationForCamera, "applyRenderingConfigurationForCamera");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/physics.js
var import_babylonjs15 = require("babylonjs");
var import_babylonjs16 = require("babylonjs");
function configurePhysicsAggregate(transformNode) {
  const data = transformNode.metadata?.physicsAggregate;
  if (!data) {
    return;
  }
  let mesh = void 0;
  if (isMesh(transformNode)) {
    mesh = transformNode;
  } else if (isInstancedMesh(transformNode)) {
    mesh = transformNode.sourceMesh;
  }
  const aggregate = new import_babylonjs16.PhysicsAggregate(transformNode, data.shape.type, {
    mesh,
    mass: data.massProperties.mass
  });
  aggregate.body.setMassProperties({
    mass: data.massProperties.mass,
    inertia: data.massProperties.inertia ? import_babylonjs15.Vector3.FromArray(data.massProperties.inertia) : void 0,
    centerOfMass: data.massProperties.centerOfMass ? import_babylonjs15.Vector3.FromArray(data.massProperties.centerOfMass) : void 0,
    inertiaOrientation: data.massProperties.inertiaOrientation ? import_babylonjs15.Quaternion.FromArray(data.massProperties.inertiaOrientation) : void 0
  });
  aggregate.shape.density = data.shape.density;
  aggregate.body.setMotionType(data.body.motionType);
  aggregate.shape.material = data.material;
  transformNode.physicsAggregate = aggregate;
  transformNode.metadata.physicsAggregate = void 0;
}
__name(configurePhysicsAggregate, "configurePhysicsAggregate");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/rendering.js
function applyRenderingConfigurations(scene, rendering) {
  const postProcessConfigurations = Array.isArray(rendering) ? rendering : [];
  postProcessConfigurations.forEach((configuration) => {
    const camera = scene.getCameraById(configuration.cameraId);
    if (!camera) {
      return;
    }
    if (configuration.ssao2RenderingPipeline) {
      ssaoRenderingPipelineCameraConfigurations.set(camera, configuration.ssao2RenderingPipeline);
    }
    if (configuration.vlsPostProcess) {
      vlsPostProcessCameraConfigurations.set(camera, configuration.vlsPostProcess);
    }
    if (configuration.ssrRenderingPipeline) {
      ssrRenderingPipelineCameraConfigurations.set(camera, configuration.ssrRenderingPipeline);
    }
    if (configuration.motionBlurPostProcess) {
      motionBlurPostProcessCameraConfigurations.set(camera, configuration.motionBlurPostProcess);
    }
    if (configuration.defaultRenderingPipeline) {
      defaultPipelineCameraConfigurations.set(camera, configuration.defaultRenderingPipeline);
    }
    if (configuration.taaRenderingPipeline) {
      taaRenderingPipelineCameraConfigurations.set(camera, configuration.taaRenderingPipeline);
    }
  });
}
__name(applyRenderingConfigurations, "applyRenderingConfigurations");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/decorators/apply.js
var import_babylonjs22 = require("babylonjs");
var import_babylonjs23 = require("babylonjs");
var import_babylonjs24 = require("babylonjs");
var import_babylonjs25 = require("babylonjs");
var import_babylonjs26 = require("babylonjs");
var import_babylonjs_gui = require("babylonjs-gui");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/sound.js
function getSoundById(id, scene) {
  const soundTracks = scene.soundTracks ?? [];
  if (!soundTracks.length) {
    soundTracks.push(scene.mainSoundTrack);
  }
  for (let i = 0, len = soundTracks.length; i < len; i++) {
    const sound = soundTracks[i].soundCollection.find((s) => s.id === id);
    if (sound) {
      return sound;
    }
  }
  return null;
}
__name(getSoundById, "getSoundById");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/vector.js
var import_babylonjs17 = require("babylonjs");
var import_babylonjs18 = require("babylonjs");
function parseAxis(axis) {
  const vector = import_babylonjs18.Vector3.FromArray(axis);
  if (vector.equals(import_babylonjs17.Axis.X)) {
    return import_babylonjs17.Axis.X;
  }
  if (vector.equals(import_babylonjs17.Axis.Y)) {
    return import_babylonjs17.Axis.Y;
  }
  if (vector.equals(import_babylonjs17.Axis.Z)) {
    return import_babylonjs17.Axis.Z;
  }
  return vector;
}
__name(parseAxis, "parseAxis");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/ragdoll.js
function parseRagdollConfiguration(configuration) {
  configuration.runtimeConfiguration.forEach((config) => {
    if (config.rotationAxis) {
      config.rotationAxis = parseAxis(config.rotationAxis);
    }
    if (config.boneOffsetAxis) {
      config.boneOffsetAxis = parseAxis(config.boneOffsetAxis);
    }
  });
  return configuration;
}
__name(parseRagdollConfiguration, "parseRagdollConfiguration");
function copyAndParseRagdollConfiguration(configuration) {
  const copy = {
    rootNodeId: configuration.rootNodeId,
    skeletonName: configuration.skeletonName,
    scalingFactor: configuration.scalingFactor,
    runtimeConfiguration: configuration.runtimeConfiguration.map((config) => ({
      name: config.name,
      bones: config.bones,
      width: config.width,
      depth: config.depth,
      height: config.height,
      size: config.size,
      joint: config.joint,
      min: config.min,
      max: config.max,
      boxOffset: config.boxOffset,
      rotationAxis: config.rotationAxis?.slice(),
      boneOffsetAxis: config.boneOffsetAxis?.slice()
    }))
  };
  return parseRagdollConfiguration(copy);
}
__name(copyAndParseRagdollConfiguration, "copyAndParseRagdollConfiguration");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/container.js
var import_babylonjs19 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/tools.js
function cloneJSObject(source) {
  if (!source) {
    return source;
  }
  return JSON.parse(JSON.stringify(source));
}
__name(cloneJSObject, "cloneJSObject");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/transform-node.js
function configureTransformNodes(scene) {
  const computedMaterials = /* @__PURE__ */ new Set();
  scene.transformNodes.forEach((transformNode) => {
    if (transformNode.metadata?.isStaticGroup) {
      const descendants = transformNode.getDescendants(false);
      descendants.push(transformNode);
      descendants.forEach((node) => {
        if (isAbstractMesh(node) || isTransformNode(node) && !node.isWorldMatrixFrozen) {
          node.freezeWorldMatrix();
        }
        if (isAbstractMesh(node)) {
          const material = node.material;
          if (material && !material.isFrozen && !computedMaterials.has(material)) {
            computedMaterials.add(material);
            material.onBindObservable.addOnce(() => {
              material.freeze();
            });
          }
        }
      });
    }
  });
}
__name(configureTransformNodes, "configureTransformNodes");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/container.js
var AdvancedAssetContainer = class {
  static {
    __name(this, "AdvancedAssetContainer");
  }
  /**
   * Defines the reference to the
   */
  container;
  _rootUrl;
  _scriptsMap;
  _originalDescendants = [];
  _nodesMap = /* @__PURE__ */ new Map();
  _animationGroupsMap = /* @__PURE__ */ new Map();
  constructor(container, rootUrl, scriptsMap2) {
    this.container = container;
    this._rootUrl = rootUrl;
    this._scriptsMap = scriptsMap2;
    container.populateRootNodes();
    container.rootNodes.forEach((node) => {
      this._originalDescendants.push(node, ...node.getDescendants(false));
    });
    this._originalDescendants.forEach((node) => {
      this._nodesMap.set(node, {
        node,
        metadata: cloneJSObject(node.metadata)
      });
    });
    container.animationGroups.forEach((animationGroup) => {
      this._animationGroupsMap.set(animationGroup.name, animationGroup);
    });
  }
  removeDefault() {
    this.container.getNodes().forEach((node) => {
      const scripts = scriptsDictionary.get(node);
      scripts?.forEach((script) => {
        _removeRegisteredScriptInstance(node, script);
      });
    });
    this.container.removeAllFromScene();
  }
  instantiate(options) {
    const namingId = import_babylonjs19.Tools.RandomId();
    const nameFunction = /* @__PURE__ */ __name((sourceName) => sourceName, "nameFunction");
    const entries = this.container.instantiateModelsToScene(nameFunction, false, {
      ...options,
      predicate: /* @__PURE__ */ __name((entity) => {
        entity.name = `${entity.name}-${namingId}_${entity.id}`;
        return options?.predicate?.(entity) ?? true;
      }, "predicate")
    });
    const newDescendants = [];
    entries.rootNodes.forEach((node) => {
      newDescendants.push(node, ...node.getDescendants(false));
    });
    newDescendants.forEach((newNode) => {
      const nameSplit = newNode.name.split("_");
      const originalId = nameSplit.pop();
      newNode.name = nameSplit.join("_");
      const originalNode = this._originalDescendants.find((n) => n.id === originalId);
      newNode.id = import_babylonjs19.Tools.RandomId();
      newNode.metadata = cloneJSObject(this._nodesMap.get(originalNode).metadata);
      newDescendants.forEach((node) => {
        node.metadata.scripts?.forEach((script) => {
          const valueKeys = Object.keys(script.values || {});
          valueKeys.forEach((key) => {
            const obj = script.values[key];
            if (obj.type === "entity") {
              if (obj.value === originalId) {
                obj.value = newNode.id;
              }
              if (obj.value === originalNode.name) {
                obj.value = newNode.name;
              }
              const originalAnimationGroup = this._animationGroupsMap.get(obj.value);
              if (originalAnimationGroup) {
                obj.value = nameFunction(originalAnimationGroup.name);
              }
            }
          });
        });
      });
    });
    newDescendants.forEach((node) => {
      _applyScriptsForObject(this.container.scene, node, this._scriptsMap, this._rootUrl);
    });
    configureTransformNodes(this.container.scene);
    return entries;
  }
};

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/script/preload/scene.js
var import_babylonjs20 = require("babylonjs");
var import_babylonjs21 = require("babylonjs");
async function preloadSceneScriptAsset(key, rootUrl, scene) {
  const filename = key.split("/").pop();
  const sceneFilename = filename.replace(".scene", ".babylon");
  const container = await (0, import_babylonjs21.LoadAssetContainerAsync)(sceneFilename, scene, {
    rootUrl,
    pluginExtension: ".babylon"
  });
  if (import_babylonjs20.SceneLoaderFlags.ForceFullSceneLoadingForIncremental) {
    scene.meshes.forEach((m) => isMesh(m) && m._checkDelayState());
  }
  container.addAllToScene();
  configureTransformNodes(scene);
  return container;
}
__name(preloadSceneScriptAsset, "preloadSceneScriptAsset");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/script/preload/common.js
async function preloadCommonScriptAsset(key, rootUrl) {
  const response = await fetch(`${rootUrl}${key}`);
  const data = await response.json();
  return data;
}
__name(preloadCommonScriptAsset, "preloadCommonScriptAsset");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/script/preload.js
var scriptAssetsCache = /* @__PURE__ */ new Map();
var scriptAssetsParsers = /* @__PURE__ */ new Map();
async function _preloadScriptsAssets(rootUrl, scene, scriptsMap2) {
  const nodes = [scene, ...scene.transformNodes, ...scene.meshes, ...scene.lights, ...scene.cameras];
  const scriptNodes = nodes.filter((node) => node.metadata?.scripts?.length).map((node) => node.metadata.scripts).flat();
  scriptNodes.forEach((script) => {
    const ctor = scriptsMap2[script.key]?.default;
    ctor?._SceneAssets?.forEach((asset) => {
      if (!scriptAssetsCache.get(asset.sceneName)) {
        scriptAssetsCache.set(asset.sceneName, null);
      }
    });
    if (script.values) {
      for (const key in script.values) {
        if (!script.values.hasOwnProperty(key)) {
          continue;
        }
        const obj = script.values[key];
        if (obj.type === "asset" && obj.value && !scriptAssetsCache.get(obj.value)) {
          scriptAssetsCache.set(obj.value, null);
        }
      }
    }
  });
  let loadedAssetsCount = 0;
  for (const value of scriptAssetsCache.values()) {
    if (value === null) {
      ++loadedAssetsCount;
    }
  }
  if (loadedAssetsCount === 0) {
    return loadedAssetsCount;
  }
  const promises = [];
  scriptAssetsCache.forEach((_, key) => {
    if (scriptAssetsCache.get(key)) {
      return;
    }
    promises.push(new Promise(async (resolve) => {
      try {
        const extension = key.split(".").pop();
        switch (extension) {
          case "scene":
            scriptAssetsCache.set(key, new AdvancedAssetContainer(await preloadSceneScriptAsset(key, rootUrl, scene), rootUrl, scriptsMap2));
            break;
          default:
            if (scriptAssetsParsers.has(extension)) {
              const parser = scriptAssetsParsers.get(extension);
              scriptAssetsCache.set(key, await parser({ key, rootUrl, scene }));
              break;
            } else {
              scriptAssetsCache.set(key, await preloadCommonScriptAsset(key, rootUrl));
            }
            break;
        }
      } catch (e) {
        console.error(e);
      }
      resolve();
    }));
  });
  await Promise.all(promises);
  return loadedAssetsCount;
}
__name(_preloadScriptsAssets, "_preloadScriptsAssets");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/decorators/apply.js
function applyDecorators(scene, object, script, instance, rootUrl) {
  const ctor = instance.constructor;
  if (!ctor) {
    return;
  }
  ctor._NodesFromScene?.forEach((params) => {
    instance[params.propertyKey.toString()] = scene.getNodeByName(params.nodeName);
  });
  ctor._NodesFromDescendants?.forEach((params) => {
    const descendant = object.getDescendants?.(params.directDescendantsOnly, (node) => node.name === params.nodeName)[0];
    instance[params.propertyKey.toString()] = descendant ?? null;
  });
  ctor._AnimationGroups?.forEach((params) => {
    instance[params.propertyKey.toString()] = scene.getAnimationGroupByName(params.animationGroupName);
  });
  ctor._SoundsFromScene?.forEach((params) => {
    const sound = scene.getSoundByName?.(params.soundName);
    instance[params.propertyKey.toString()] = sound ?? null;
  });
  (ctor._GuiFromAsset ?? []).map(async (params) => {
    const guiUrl = `${rootUrl}assets/${params.pathInAssets}`;
    try {
      const response = await fetch(guiUrl);
      const data = await response.json();
      const gui = import_babylonjs_gui.AdvancedDynamicTexture.CreateFullscreenUI(data.name, true, scene);
      gui.parseSerializedObject(data.content, false);
      instance[params.propertyKey.toString()] = gui;
      params.onGuiCreated?.(instance, gui);
    } catch (e) {
      console.error(`Failed to load GUI from asset: ${guiUrl}`);
      throw e;
    }
  });
  ctor._ParticleSystemsFromScene?.forEach((params) => {
    const particleSystem = scene.particleSystems?.find((particleSystem2) => {
      if (particleSystem2.name !== params.particleSystemName) {
        return false;
      }
      return params.directDescendantsOnly ? particleSystem2.emitter === object : particleSystem2;
    });
    instance[params.propertyKey.toString()] = particleSystem;
  });
  (ctor._VisibleInInspector ?? []).forEach((params) => {
    const propertyKey = params.propertyKey.toString();
    const attachedScripts = script.values;
    if (!attachedScripts) {
      throw new Error(`No values found for script with key "${script.key}".`);
    }
    if (attachedScripts.hasOwnProperty(propertyKey) && attachedScripts[propertyKey].hasOwnProperty("value")) {
      const value = attachedScripts[propertyKey].value;
      switch (params.configuration.type) {
        case "number":
        case "boolean":
        case "keymap":
        case "string":
          instance[propertyKey] = value;
          break;
        case "vector2":
          instance[propertyKey] = import_babylonjs25.Vector2.FromArray(value);
          break;
        case "vector3":
          instance[propertyKey] = import_babylonjs25.Vector3.FromArray(value);
          break;
        case "color3":
          instance[propertyKey] = import_babylonjs23.Color3.FromArray(value);
          break;
        case "color4":
          instance[propertyKey] = import_babylonjs23.Color4.FromArray(value);
          break;
        case "entity":
          const entityType = params.configuration.entityType;
          switch (entityType) {
            case "node":
              instance[propertyKey] = scene.getNodeById(value) ?? null;
              break;
            case "animationGroup":
              instance[propertyKey] = scene.getAnimationGroupByName(value) ?? null;
              break;
            case "sound":
              instance[propertyKey] = getSoundById(value, scene);
              break;
            case "particleSystem":
              instance[propertyKey] = scene.particleSystems?.find((ps) => ps.id === value) ?? null;
              break;
          }
          break;
        case "texture":
          if (value) {
            instance[propertyKey] = import_babylonjs24.Texture.Parse(value, scene, rootUrl);
          }
          break;
        case "asset":
          if (value) {
            const assetType = params.configuration.assetType;
            const data = scriptAssetsCache.get(value);
            switch (assetType) {
              case "json":
              case "gui":
              case "scene":
              case "navmesh":
                instance[propertyKey] = data;
                break;
              case "ragdoll":
                instance[propertyKey] = copyAndParseRagdollConfiguration(data);
                break;
              case "nodeParticleSystemSet":
                const npss = import_babylonjs26.NodeParticleSystemSet.Parse(data);
                instance[propertyKey] = npss;
                break;
              case "material":
                instance[propertyKey] = import_babylonjs22.Material.Parse(data, scene, rootUrl);
                break;
            }
          }
      }
    }
  });
  let pointerObserver = null;
  let keyboardObserver = null;
  if (ctor._PointerEvents?.length) {
    const wrongMeshListener = ctor._PointerEvents.find((params) => params.options.mode === "attachedMeshOnly");
    if (wrongMeshListener && !isAbstractMesh(object)) {
      throw new Error(`@onPointerEvent with mode "attachedMeshOnly" can only be used on scripts attached to meshes (extends AbstractMesh).`);
    }
    const wrongSceneListener = ctor._PointerEvents.find((params) => params.options.mode !== "global");
    if (wrongSceneListener && !isNode(object)) {
      throw new Error(`@onPointerEvent with mode different from "global" can be used only on scripts attached to Node: Mesh, Light, Camera, TransformNode.`);
    }
    pointerObserver = scene.onPointerObservable.add((pointerInfo) => {
      let pickInfo = null;
      ctor._PointerEvents.forEach((params) => {
        if (!params.eventTypes.includes(pointerInfo.type)) {
          return;
        }
        const propertyKey = params.propertyKey.toString();
        if (params.options.mode === "global") {
          return instance[propertyKey]?.(pointerInfo);
        }
        pickInfo = pointerInfo.pickInfo;
        if (!pickInfo) {
          pickInfo = scene.pick(scene.pointerX, scene.pointerY, (m) => {
            return m.isVisible && m.isPickable && m.isEnabled(true) && !m._masterMesh;
          }, false);
        }
        const pickedMesh = pickInfo.pickedMesh;
        if (pickedMesh) {
          if (params.options.mode === "attachedMeshOnly" && pickedMesh === object) {
            return instance[propertyKey]?.(pointerInfo);
          }
          if (params.options.mode === "includeDescendants" && isNode(object)) {
            const descendants = [object, ...object.getDescendants(false)];
            const pickedDescendant = descendants.find((d) => d === pickedMesh);
            if (pickedDescendant) {
              return instance[propertyKey]?.(pointerInfo);
            }
          }
        }
      });
    });
  }
  if (ctor._KeyboardEvents?.length) {
    keyboardObserver = scene.onKeyboardObservable.add((keyboardInfo) => {
      ctor._KeyboardEvents.forEach((params) => {
        if (!params.eventTypes.includes(keyboardInfo.type)) {
          return;
        }
        instance[params.propertyKey.toString()]?.(keyboardInfo);
      });
    });
  }
  if (ctor._SpritesFromSpriteManager?.length) {
    const spriteManagerNode = object;
    if (!isTransformNode(spriteManagerNode) || !spriteManagerNode.isSpriteManager) {
      return console.error(`@spriteFromSpriteManager decorator can only be used on SpriteManagerNode.`);
    }
    if (!spriteManagerNode.spriteManager) {
      return console.error(`SpriteManagerNode "${spriteManagerNode.name}" has no sprite manager assigned.`);
    }
    ctor._SpritesFromSpriteManager?.forEach((params) => {
      const sprite = spriteManagerNode.spriteManager?.sprites.find((s) => s.name === params.spriteName) || null;
      instance[params.propertyKey.toString()] = sprite;
    });
  }
  if (ctor._AnimationsFromSprite?.length) {
    if (!isSprite(object)) {
      return console.error(`@animationFromSprite decorator can only be used in scripts attached on Sprite.`);
    }
    const spriteAnimations = object.metadata?.spriteAnimations;
    if (!spriteAnimations?.length) {
      return console.error(`Sprite "${object.name}" has no sprite animations assigned.`);
    }
    ctor._AnimationsFromSprite.forEach((params) => {
      const animation = spriteAnimations.find((a) => a.name === params.animationName);
      if (animation) {
        instance[params.propertyKey.toString()] = animation ?? null;
      } else {
        console.warn(`Sprite animation named "${params.animationName}" not found on sprite "${object.name}".`);
      }
    });
  }
  ctor._SceneAssets?.forEach((params) => {
    instance[params.propertyKey.toString()] = scriptAssetsCache.get(params.sceneName);
  });
  return {
    observers: {
      pointerObserver,
      keyboardObserver
    }
  };
}
__name(applyDecorators, "applyDecorators");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/script/apply.js
function _applyScriptsForObject(scene, object, scriptsMap2, rootUrl) {
  if (!object.metadata?.scripts) {
    return;
  }
  object.metadata.scripts?.forEach((script) => {
    if (!script.enabled) {
      return;
    }
    const exports2 = scriptsMap2[script.key];
    if (!exports2) {
      return;
    }
    let result = exports2;
    const observers = {};
    if (exports2.default) {
      result = new exports2.default(object);
      const decoratorsResult = applyDecorators(scene, object, script, result, rootUrl);
      Object.assign(observers, decoratorsResult?.observers ?? {});
    }
    if (result.onStart) {
      observers.onStartObserver = scene.onBeforeRenderObservable.addOnce(() => result.onStart(object));
    }
    if (result.onUpdate) {
      observers.onUpdateObserver = scene.onBeforeRenderObservable.add(() => result.onUpdate(object));
    }
    _registerScriptInstance(object, result, script.key, observers);
  });
  object.metadata.scripts = void 0;
}
__name(_applyScriptsForObject, "_applyScriptsForObject");
var scriptsDictionary = /* @__PURE__ */ new Map();
function _registerScriptInstance(object, scriptInstance, key, observers) {
  const registeredScript = {
    key,
    observers,
    instance: scriptInstance
  };
  if (!scriptsDictionary.has(object)) {
    scriptsDictionary.set(object, [registeredScript]);
  } else {
    scriptsDictionary.get(object).push(registeredScript);
  }
  if (isNode(object) || isAnyParticleSystem(object) || isScene(object)) {
    object.onDisposeObservable.addOnce((() => {
      const scripts = scriptsDictionary.get(object)?.slice();
      scripts?.forEach((s) => {
        _removeRegisteredScriptInstance(object, s);
      });
      scriptsDictionary.delete(object);
    }));
  }
}
__name(_registerScriptInstance, "_registerScriptInstance");
function _removeRegisteredScriptInstance(object, registeredScript) {
  registeredScript.observers.onStartObserver?.remove();
  registeredScript.observers.onUpdateObserver?.remove();
  registeredScript.observers.pointerObserver?.remove();
  registeredScript.observers.keyboardObserver?.remove();
  try {
    registeredScript.instance.onStop?.(object);
  } catch (e) {
    console.error(`Failed to call onStop for script ${registeredScript.key} on object ${object}`, e);
  }
  const runningScripts = scriptsDictionary.get(object);
  const index = runningScripts?.indexOf(registeredScript) ?? -1;
  if (index !== -1) {
    runningScripts?.splice(index, 1);
  }
}
__name(_removeRegisteredScriptInstance, "_removeRegisteredScriptInstance");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/sound.js
var import_babylonjs27 = require("babylonjs");
var registered = false;
function registerAudioParser() {
  if (registered) {
    return;
  }
  registered = true;
  (0, import_babylonjs27.AddParser)("AudioEditorPlugin", (parsedData, scene, container, _rootUrl) => {
    parsedData.sounds?.forEach((sound) => {
      const instance = container.sounds?.find((s) => s.name === sound.name);
      if (instance) {
        instance.id = sound.id;
        instance.uniqueId = sound.uniqueId;
        scene.onBeforeRenderObservable.addOnce(() => {
          try {
            instance.spatialSound = sound.spatialSound;
          } catch (e) {
          }
        });
      }
    });
  });
}
__name(registerAudioParser, "registerAudioParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/texture.js
var import_babylonjs28 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/scalar.js
function getPowerOfTwoUntil(limit) {
  let size = 1;
  while (size <= limit) {
    size <<= 1;
  }
  return size >> 1;
}
__name(getPowerOfTwoUntil, "getPowerOfTwoUntil");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/texture.js
var registered2 = false;
function registerTextureParser() {
  if (registered2) {
    return;
  }
  registered2 = true;
  const textureParser = import_babylonjs28.SerializationHelper._TextureParser;
  import_babylonjs28.SerializationHelper._TextureParser = (sourceProperty, scene, rootUrl) => {
    if (scene.loadingTexturesQuality === "high" || !sourceProperty.metadata?.baseSize) {
      return textureParser(sourceProperty, scene, rootUrl);
    }
    const width = sourceProperty.metadata.baseSize.width;
    const height = sourceProperty.metadata.baseSize.height;
    const isPowerOfTwo = width === getPowerOfTwoUntil(width) || height === getPowerOfTwoUntil(height);
    let suffix = "";
    switch (scene.loadingTexturesQuality) {
      case "medium":
        let midWidth = width * 0.66 >> 0;
        let midHeight = height * 0.66 >> 0;
        if (isPowerOfTwo) {
          midWidth = getPowerOfTwoUntil(midWidth);
          midHeight = getPowerOfTwoUntil(midHeight);
        }
        suffix = `_${midWidth}_${midHeight}`;
        break;
      case "low":
      case "very-low":
        let lowWidth = width * 0.33 >> 0;
        let lowHeight = height * 0.33 >> 0;
        if (isPowerOfTwo) {
          lowWidth = getPowerOfTwoUntil(lowWidth);
          lowHeight = getPowerOfTwoUntil(lowHeight);
        }
        suffix = `_${lowWidth}_${lowHeight}`;
        break;
    }
    const name = sourceProperty.name;
    if (!name || !suffix) {
      return textureParser(sourceProperty, scene, rootUrl);
    }
    const finalUrl = name.split("/");
    const filename = finalUrl.pop();
    if (!filename) {
      return textureParser(sourceProperty, scene, rootUrl);
    }
    const extension = filename.split(".").pop();
    const baseFilename = filename.replace(`.${extension}`, "");
    const newFilename = `${baseFilename}${suffix}.${extension}`;
    finalUrl.push(newFilename);
    sourceProperty.name = finalUrl.join("/");
    return textureParser(sourceProperty, scene, rootUrl);
  };
}
__name(registerTextureParser, "registerTextureParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/shadows.js
var import_babylonjs29 = require("babylonjs");
var import_babylonjs30 = require("babylonjs");
var registered3 = false;
function registerShadowGeneratorParser() {
  if (registered3) {
    return;
  }
  registered3 = true;
  const shadowsGeneratorParser = (0, import_babylonjs30.GetParser)(import_babylonjs29.SceneComponentConstants.NAME_SHADOWGENERATOR);
  (0, import_babylonjs30.AddParser)("ShadowGeneratorEditorPlugin", (parsedData, scene, container, rootUrl) => {
    if (scene.loadingShadowsQuality !== "high") {
      parsedData.shadowGenerators?.forEach((shadowGenerator) => {
        switch (scene.loadingShadowsQuality) {
          case "medium":
            shadowGenerator.mapSize = shadowGenerator.mapSize * 0.5;
            break;
          case "low":
            shadowGenerator.mapSize = shadowGenerator.mapSize * 0.25;
            break;
          case "very-low":
            shadowGenerator.mapSize = shadowGenerator.mapSize * 0.125;
            break;
        }
        shadowGenerator.mapSize = Math.max(128, getPowerOfTwoUntil(shadowGenerator.mapSize));
      });
    }
    shadowsGeneratorParser?.(parsedData, scene, container, rootUrl);
  });
}
__name(registerShadowGeneratorParser, "registerShadowGeneratorParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/morph-target-manager.js
var import_babylonjs31 = require("babylonjs");
var import_babylonjs32 = require("babylonjs");
var registered4 = false;
function registerMorphTargetManagerParser() {
  if (registered4) {
    return;
  }
  registered4 = true;
  (0, import_babylonjs32.AddParser)("MorphTargetManagerEditorPlugin", (parsedData, scene, container, rootUrl) => {
    parsedData.morphTargetManagers.forEach((morphTargetManagerData) => {
      const meshInstance = container.meshes.find((mesh) => {
        return mesh.id === morphTargetManagerData.meshId;
      });
      const morphTargetManager = meshInstance?.morphTargetManager;
      if (!morphTargetManager) {
        return;
      }
      const shouldExit = morphTargetManagerData.targets.find((target) => !target.delayLoadingFile);
      if (shouldExit) {
        return;
      }
      const promises = [];
      morphTargetManagerData.targets.forEach((target) => {
        if (!target.delayLoadingFile) {
          return promises.push(Promise.resolve(null));
        }
        const absolutePath = `${rootUrl}${target.delayLoadingFile}`;
        scene.addPendingData(absolutePath);
        const request = new import_babylonjs31.WebRequest();
        request.responseType = "arraybuffer";
        request.open("GET", absolutePath);
        request.send();
        promises.push(new Promise((resolve) => {
          request.addEventListener("load", () => {
            scene.removePendingData(absolutePath);
            resolve(request.response);
          });
        }));
      });
      Promise.all(promises).then((allBuffers) => {
        for (let i = 0, len = morphTargetManager.numTargets; i < len; ++i) {
          const instancedTarget = morphTargetManager.getTarget(i);
          const sourceTargetData = morphTargetManagerData.targets[i];
          const buffer = allBuffers[i];
          if (sourceTargetData.positionsCount) {
            const positions = new Float32Array(buffer, sourceTargetData.positionsOffset, sourceTargetData.positionsCount);
            instancedTarget["_positions"] = positions;
            instancedTarget.setPositions(positions);
          }
          if (sourceTargetData.normalsCount) {
            const normals = new Float32Array(buffer, sourceTargetData.normalsOffset, sourceTargetData.normalsCount);
            instancedTarget["_normals"] = normals;
            instancedTarget.setNormals(normals);
          }
          if (sourceTargetData.tangentsCount) {
            const tangents = new Float32Array(buffer, sourceTargetData.tangentsOffset, sourceTargetData.tangentsCount);
            instancedTarget["_tangents"] = tangents;
            instancedTarget.setTangents(tangents);
          }
          if (sourceTargetData.uvsCount) {
            const uvs = new Float32Array(buffer, sourceTargetData.uvsOffset, sourceTargetData.uvsCount);
            instancedTarget["_uvs"] = uvs;
            instancedTarget.setUVs(uvs);
          }
          if (sourceTargetData.uv2sCount) {
            const uv2s = new Float32Array(buffer, sourceTargetData.uv2sOffset, sourceTargetData.uv2sCount);
            instancedTarget["_uv2s"] = uv2s;
            instancedTarget.setUV2s(uv2s);
          }
        }
        for (let i = 0, len = morphTargetManager.numTargets; i < len; ++i) {
          const instancedTarget = morphTargetManager.getTarget(i);
          instancedTarget._onDataLayoutChanged.notifyObservers();
        }
      });
    });
  });
}
__name(registerMorphTargetManagerParser, "registerMorphTargetManagerParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/sprite-map.js
var import_babylonjs33 = require("babylonjs");
var import_babylonjs34 = require("babylonjs");
var import_babylonjs35 = require("babylonjs");
var import_babylonjs36 = require("babylonjs");
var import_babylonjs37 = require("babylonjs");
var import_babylonjs38 = require("babylonjs");
var import_babylonjs39 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/sprite.js
function normalizeAtlasJson(data) {
  if (!Array.isArray(data.frames)) {
    const frames = [];
    for (const key of Object.keys(data.frames)) {
      frames.push({
        filename: key,
        ...data.frames[key]
      });
    }
    data.frames = frames;
  }
}
__name(normalizeAtlasJson, "normalizeAtlasJson");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/sprite-map.js
var registered5 = false;
function registerSpriteMapParser() {
  if (registered5) {
    return;
  }
  registered5 = true;
  (0, import_babylonjs39.AddParser)("SpriteMapNode", (parsedData, scene, container, rootUrl) => {
    parsedData.transformNodes?.forEach((transformNode) => {
      if (!transformNode.isSpriteMap) {
        return;
      }
      const instance = container.transformNodes?.find((t) => t.id === transformNode.id);
      if (!instance) {
        return;
      }
      instance.isSpriteMap = transformNode.isSpriteMap;
      const atlasJsonAbsolutePath = `${rootUrl}${transformNode.atlasJsonRelativePath}`;
      scene.addPendingData(atlasJsonAbsolutePath);
      const atlasRequest = new import_babylonjs35.WebRequest();
      atlasRequest.open("GET", atlasJsonAbsolutePath);
      atlasRequest.send();
      atlasRequest.addEventListener("load", () => {
        scene.removePendingData(atlasJsonAbsolutePath);
        const atlasJson = JSON.parse(atlasRequest.responseText);
        normalizeAtlasJson(atlasJson);
        const imagePath = `${import_babylonjs33.Tools.GetFolderPath(atlasJsonAbsolutePath)}${atlasJson.meta.image}`;
        const spritesheet = new import_babylonjs37.Texture(imagePath, scene, false, false, import_babylonjs37.Texture.NEAREST_NEAREST, null, null, null, false, import_babylonjs34.Engine.TEXTUREFORMAT_RGBA);
        const spriteMap = new import_babylonjs36.SpriteMap(instance.name, atlasJson, spritesheet, {
          layerCount: transformNode.options.layerCount,
          stageSize: import_babylonjs38.Vector2.FromArray(transformNode.options.stageSize ?? [10, 1]),
          outputSize: import_babylonjs38.Vector2.FromArray(transformNode.options.outputSize ?? [100, 100]),
          colorMultiply: import_babylonjs38.Vector3.FromArray(transformNode.options.colorMultiply ?? [1, 1, 1]),
          flipU: true
        }, scene);
        transformNode.tiles.forEach((tile) => {
          for (let x = 0, lenX = tile.repeatCount.x + 1; x < lenX; ++x) {
            for (let y = 0, lenY = tile.repeatCount.y + 1; y < lenY; ++y) {
              const offsetX = x * (tile.repeatOffset.x + 1);
              const offsetY = y * (tile.repeatOffset.y + 1);
              spriteMap.changeTiles(tile.layer, new import_babylonjs38.Vector2(tile.position.x + offsetX, (spriteMap.options.stageSize?.y ?? 0) - 1 - tile.position.y - offsetY), tile.tile);
            }
          }
        });
        const outputPlane = spriteMap["_output"];
        outputPlane.parent = instance;
        instance.spriteMap = spriteMap;
      });
    });
  });
}
__name(registerSpriteMapParser, "registerSpriteMapParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/sprite-manager.js
var import_babylonjs40 = require("babylonjs");
var import_babylonjs41 = require("babylonjs");
var import_babylonjs42 = require("babylonjs");
var import_babylonjs43 = require("babylonjs");
var import_babylonjs44 = require("babylonjs");
function parseSerializedSpriteManager(spriteManager, parsedSpriteManager) {
  if (parsedSpriteManager?.fogEnabled !== void 0) {
    spriteManager.fogEnabled = parsedSpriteManager?.fogEnabled;
  }
  if (parsedSpriteManager?.blendMode !== void 0) {
    spriteManager.blendMode = parsedSpriteManager?.blendMode;
  }
  if (parsedSpriteManager?.disableDepthWrite !== void 0) {
    spriteManager.disableDepthWrite = parsedSpriteManager?.disableDepthWrite;
  }
  if (parsedSpriteManager?.pixelPerfect !== void 0) {
    spriteManager.pixelPerfect = parsedSpriteManager?.pixelPerfect;
  }
  if (parsedSpriteManager?.useLogarithmicDepth !== void 0) {
    spriteManager.useLogarithmicDepth = parsedSpriteManager?.useLogarithmicDepth;
  }
  if (parsedSpriteManager?.metadata !== void 0) {
    spriteManager.metadata = parsedSpriteManager?.metadata;
  }
  for (const parsedSprite of parsedSpriteManager?.sprites ?? []) {
    const sprite = import_babylonjs41.Sprite.Parse(parsedSprite, spriteManager);
    sprite.uniqueId = parsedSprite.uniqueId;
    sprite.metadata = parsedSprite.metadata;
  }
}
__name(parseSerializedSpriteManager, "parseSerializedSpriteManager");
var registered6 = false;
function registerSpriteManagerParser() {
  if (registered6) {
    return;
  }
  registered6 = true;
  (0, import_babylonjs44.AddParser)("SpriteManagerNode", (parsedData, scene, container, rootUrl) => {
    parsedData.transformNodes?.forEach((transformNode) => {
      if (!transformNode.isSpriteManager) {
        return;
      }
      const instance = container.transformNodes?.find((t) => t.id === transformNode.id);
      if (!instance) {
        return;
      }
      instance.isSpriteManager = transformNode.isSpriteManager;
      if (transformNode.atlasJsonRelativePath) {
        const atlasJsonAbsolutePath = `${rootUrl}${transformNode.atlasJsonRelativePath}`;
        scene.addPendingData(atlasJsonAbsolutePath);
        const request = new import_babylonjs42.WebRequest();
        request.open("GET", atlasJsonAbsolutePath);
        request.send();
        request.addEventListener("load", () => {
          scene.removePendingData(atlasJsonAbsolutePath);
          const atlasJson = JSON.parse(request.responseText);
          const imagePath = `${import_babylonjs40.Tools.GetFolderPath(atlasJsonAbsolutePath)}${atlasJson.meta.image}`;
          const spriteManager = new import_babylonjs43.SpriteManager(instance.name, imagePath, 1e3, 64, scene, void 0, void 0, true, atlasJson);
          instance.spriteManager = spriteManager;
          if (transformNode.spriteManager) {
            parseSerializedSpriteManager(spriteManager, transformNode.spriteManager);
          }
        });
      } else if (transformNode.spriteManager?.textureUrl) {
        const imagePath = `${rootUrl}${transformNode.spriteManager.textureUrl}`;
        const spriteManager = new import_babylonjs43.SpriteManager(instance.name, imagePath, 1e3, {
          width: transformNode.spriteManager.cellWidth,
          height: transformNode.spriteManager.cellHeight
        }, scene, void 0, void 0, false);
        instance.spriteManager = spriteManager;
        if (transformNode.spriteManager) {
          parseSerializedSpriteManager(spriteManager, transformNode.spriteManager);
        }
      }
    });
  });
}
__name(registerSpriteManagerParser, "registerSpriteManagerParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/node-particle-system-set.js
var import_babylonjs45 = require("babylonjs");
var import_babylonjs46 = require("babylonjs");
var registered7 = false;
function registerNodeParticleSystemSetParser() {
  if (registered7) {
    return;
  }
  registered7 = true;
  (0, import_babylonjs45.AddParser)("NodeParticleSystemSetEditorPlugin", (parsedData, scene, container, rootUrl) => {
    parsedData.meshes?.forEach((mesh) => {
      if (!mesh.isNodeParticleSystemMesh) {
        return;
      }
      const instance = container.meshes?.find((m) => m.id === mesh.id);
      if (!instance) {
        return;
      }
      mesh.nodeParticleSystemSet.blocks?.forEach((block) => {
        if (block.url) {
          block.url = `${rootUrl}${block.url}`;
        }
      });
      instance.nodeParticleSystemSet = import_babylonjs46.NodeParticleSystemSet.Parse(mesh.nodeParticleSystemSet);
      instance.nodeParticleSystemSet.id = mesh.nodeParticleSystemSet.id;
      instance.nodeParticleSystemSet.uniqueId = mesh.uniqueId;
      scene.addPendingData(mesh.id);
      instance.nodeParticleSystemSet.buildAsync(scene, false).then((particleSystemSet) => {
        scene.removePendingData(mesh.id);
        instance.particleSystemSet = particleSystemSet;
        particleSystemSet.systems.forEach((particleSystem) => {
          if (isParticleSystem(particleSystem)) {
            const sizeCreationProcess = particleSystem._sizeCreation.process;
            if (sizeCreationProcess) {
              particleSystem._sizeCreation.process = (particle, system) => {
                sizeCreationProcess(particle, system);
                particle.scale.x *= 100;
                particle.scale.y *= 100;
              };
            }
          }
        });
        particleSystemSet.emitterNode = instance;
        particleSystemSet.start();
      });
    });
  });
}
__name(registerNodeParticleSystemSetParser, "registerNodeParticleSystemSetParser");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/loader.js
async function loadScene(rootUrl, sceneFilename, scene, scriptsMap2, options) {
  scene.loadingQuality = options?.quality ?? "high";
  scene.loadingTexturesQuality = options?.texturesQuality ?? scene.loadingQuality;
  scene.loadingShadowsQuality = options?.shadowsQuality ?? scene.loadingQuality;
  registerAudioParser();
  registerTextureParser();
  registerShadowGeneratorParser();
  registerMorphTargetManagerParser();
  registerSpriteMapParser();
  registerSpriteManagerParser();
  registerNodeParticleSystemSetParser();
  await (0, import_babylonjs49.AppendSceneAsync)(`${rootUrl}${sceneFilename}`, scene, {
    pluginExtension: ".babylon",
    onProgress: /* @__PURE__ */ __name((event) => {
      const progress = Math.min(event.loaded / event.total * 0.5);
      options?.onProgress?.(progress);
    }, "onProgress")
  });
  if (!options?.skipAssetsPreload) {
    let loadedAssetsCount = 0;
    do {
      loadedAssetsCount = await _preloadScriptsAssets(rootUrl, scene, scriptsMap2);
    } while (loadedAssetsCount !== 0);
  }
  if (import_babylonjs50.SceneLoaderFlags.ForceFullSceneLoadingForIncremental) {
    scene.meshes.forEach((m) => isMesh(m) && m._checkDelayState());
  }
  const waitingItemsCount = scene.getWaitingItemsCount();
  while (!scene.isDisposed && (!scene.isReady() || scene.getWaitingItemsCount() > 0)) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const loadedItemsCount = waitingItemsCount - scene.getWaitingItemsCount();
    if (loadedItemsCount === waitingItemsCount) {
      scene.textures.forEach((texture) => {
        if (texture.delayLoadState === import_babylonjs48.Constants.DELAYLOADSTATE_NONE) {
          texture.delayLoadState = import_babylonjs48.Constants.DELAYLOADSTATE_LOADED;
        }
      });
    }
    options?.onProgress?.(0.5 + loadedItemsCount / waitingItemsCount * 0.5);
  }
  options?.onProgress?.(1);
  configureShadowMapRenderListPredicate(scene);
  configureShadowMapRefreshRate(scene);
  if (scene.metadata?.rendering) {
    applyRenderingConfigurations(scene, scene.metadata.rendering);
    if (scene.activeCamera) {
      applyRenderingConfigurationForCamera(scene.activeCamera, rootUrl);
    }
  }
  if (scene.metadata?.physicsGravity) {
    scene.getPhysicsEngine()?.setGravity(import_babylonjs47.Vector3.FromArray(scene.metadata?.physicsGravity));
  }
  _applyScriptsForObject(scene, scene, scriptsMap2, rootUrl);
  scene.transformNodes.forEach((transformNode) => {
    _applyScriptsForObject(scene, transformNode, scriptsMap2, rootUrl);
  });
  scene.meshes.forEach((mesh) => {
    configurePhysicsAggregate(mesh);
    _applyScriptsForObject(scene, mesh, scriptsMap2, rootUrl);
  });
  scene.lights.forEach((light) => {
    _applyScriptsForObject(scene, light, scriptsMap2, rootUrl);
  });
  scene.cameras.forEach((camera) => {
    _applyScriptsForObject(scene, camera, scriptsMap2, rootUrl);
  });
  scene.spriteManagers?.forEach((spriteManager) => {
    spriteManager.sprites.forEach((sprite) => {
      _applyScriptsForObject(scene, sprite, scriptsMap2, rootUrl);
    });
  });
  configureTransformNodes(scene);
}
__name(loadScene, "loadScene");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/loading/material.js
var import_babylonjs51 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/animation.js
var import_babylonjs52 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/tools/particle.js
var import_babylonjs53 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/decorators/inspector.js
function visibleAsNumber(label, configuration) {
  return function(target, propertyKey) {
    const ctor = target.constructor;
    ctor._VisibleInInspector ??= [];
    ctor._VisibleInInspector.push({
      label,
      propertyKey,
      configuration: {
        ...configuration,
        type: "number"
      }
    });
  };
}
__name(visibleAsNumber, "visibleAsNumber");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/cinematic/parse.js
var import_babylonjs55 = require("babylonjs");
var import_babylonjs56 = require("babylonjs");
var import_babylonjs57 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/cinematic/tools.js
var import_babylonjs54 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/cinematic/generate.js
var import_babylonjs61 = require("babylonjs");
var import_babylonjs62 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/cinematic/events/apply-impulse.js
var import_babylonjs58 = require("babylonjs");
var zeroVector = import_babylonjs58.Vector3.Zero();

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/node_modules/babylonjs-editor-tools/build/src/cinematic/cinematic.js
var import_babylonjs59 = require("babylonjs");
var import_babylonjs60 = require("babylonjs");

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/src/scripts/box.ts
var box_exports = {};
__export(box_exports, {
  default: () => SceneComponent
});
var import_babylonjs63 = require("babylonjs");
var SceneComponent = class {
  constructor(mesh) {
    this.mesh = mesh;
  }
  static {
    __name(this, "SceneComponent");
  }
  _speed = 0.04;
  onStart() {
  }
  onUpdate() {
    this.mesh.rotate(import_babylonjs63.Vector3.UpReadOnly, this._speed * this.mesh.getScene().getAnimationRatio());
  }
};
__decorateClass([
  visibleAsNumber("Speed", {
    min: 0,
    max: 0.1
  })
], SceneComponent.prototype, "_speed", 2);

// ../../Users/enriq/OneDrive/Documentos/Developer/Altomobile/drumsquattro/quattro_test/babylon-editor-project/src/scripts.ts
var scriptsMap = {
  "scripts/box.ts": box_exports
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  _applyScriptsForObject,
  _preloadScriptsAssets,
  _removeRegisteredScriptInstance,
  loadScene,
  scriptAssetsCache,
  scriptsDictionary,
  scriptsMap
});
//# sourceMappingURL=script.cjs.map
