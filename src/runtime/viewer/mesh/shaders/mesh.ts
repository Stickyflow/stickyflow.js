import { ENVIRONMENT_LOOKUP, ENVIRONMENT_SHADOW_LOOKUP, SCREEN_OCCLUSION, SHADOW_LOOKUP, TONE_CURVE } from './chunks';

export const VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormal;
uniform mat4 uLight;
uniform mat4 uEnvLight;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vShadow;
out vec4 vEnvShadow;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = uNormal * aNormal;
  vUv = aUv;
  vShadow = uLight * world;
  vEnvShadow = uEnvLight * world;
  gl_Position = uViewProjection * world;
}`;

export const FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec4 uBase;
uniform float uShadows;
uniform vec3 uKey;
uniform vec3 uSun;
uniform vec3 uGlare;
uniform vec3 uSky;
uniform vec3 uFloor;
uniform float uFill;
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uEye;
uniform bool uHasTexture;
uniform sampler2D uTexture;
uniform bool uHasNormal;
uniform sampler2D uNormalMap;
uniform float uNormalScale;
uniform bool uHasSurface;
uniform sampler2D uSurfaceMap;
uniform bool uHasOcclusion;
uniform sampler2D uOcclusionMap;
uniform float uOcclusionStrength;
uniform bool uHasEmissive;
uniform sampler2D uEmissiveMap;
uniform vec3 uEmissive;
uniform bool uHasEnvironment;
uniform sampler2D uEnvironment;
uniform float uEnvironmentLevels;
uniform float uEnvironmentStrength;
uniform vec2 uEnvironmentTurn;
uniform vec3 uIrradiance[9];
// How much the light is scaled before the filmic curve.
uniform float uExposure;
// A frame of a still picture stays light, as the frames are added up before they are shown.
uniform bool uStill;
// When the meshes are drawn turned over, as what the ground reflects: the height of the ground, over what height above it the
// picture fades, and how strong it is. Zero when they are drawn as themselves.
uniform vec3 uMirror;
${SCREEN_OCCLUSION}
out vec4 fragment;
${SHADOW_LOOKUP}
${ENVIRONMENT_SHADOW_LOOKUP}
const float PI = 3.14159265;
const vec3 FILL = vec3(-0.6, 0.3, 0.7);
${ENVIRONMENT_LOOKUP}

vec3 environment(vec3 d, float roughness) {
  return textureLod(uEnvironment, equirect(turned(d, uEnvironmentTurn)), roughness * uEnvironmentLevels).rgb * uEnvironmentStrength;
}

// The light a matte surface gets from the whole environment, already divided by pi.
vec3 irradiance(vec3 n) {
  n = turned(n, uEnvironmentTurn);
  vec3 e = uIrradiance[0] * 0.282095
    + uIrradiance[1] * 0.488603 * n.y
    + uIrradiance[2] * 0.488603 * n.z
    + uIrradiance[3] * 0.488603 * n.x
    + uIrradiance[4] * 1.092548 * n.x * n.y
    + uIrradiance[5] * 1.092548 * n.y * n.z
    + uIrradiance[6] * 0.315392 * (3.0 * n.z * n.z - 1.0)
    + uIrradiance[7] * 1.092548 * n.x * n.z
    + uIrradiance[8] * 0.546274 * (n.x * n.x - n.y * n.y);
  return max(e, vec3(0.0)) * uEnvironmentStrength;
}

${TONE_CURVE}

// A room worked out from a direction: the sky, the floor and the sun, blurrier the rougher the surface is.
vec3 room(vec3 d, float roughness) {
  float blur = 0.08 + roughness * 0.6;
  vec3 color = mix(uFloor, uSky, smoothstep(-blur, blur, d.y));
  float window = pow(max(dot(d, uKey), 0.0), mix(160.0, 3.0, roughness));
  return color + uGlare * window * mix(3.0, 0.25, roughness);
}

vec3 light(vec3 n, vec3 v, vec3 l, vec3 radiance, vec3 albedo, vec3 f0, float roughness, float metallic) {
  vec3 h = normalize(v + l);
  float nl = max(dot(n, l), 0.0);
  float nv = max(dot(n, v), 0.001);
  float nh = max(dot(n, h), 0.0);
  float a = roughness * roughness;
  float a2 = a * a;
  float d = a2 / max(PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0), 0.0001);
  float k = pow(roughness + 1.0, 2.0) / 8.0;
  float g = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  vec3 f = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
  vec3 specular = d * g * f / max(4.0 * nv * nl, 0.001);
  vec3 diffuse = (1.0 - f) * (1.0 - metallic) * albedo / PI;
  return (diffuse + specular) * radiance * nl;
}

// The file need not say how its pictures lie on the surface, as that follows from how they change across a pixel.
vec3 bumped(vec3 n) {
  vec3 dx = dFdx(vWorld);
  vec3 dy = dFdy(vWorld);
  vec2 ux = dFdx(vUv);
  vec2 uy = dFdy(vUv);
  vec3 alongY = cross(dy, n);
  vec3 alongX = cross(n, dx);
  vec3 t = alongY * ux.x + alongX * uy.x;
  vec3 b = alongY * ux.y + alongX * uy.y;
  float size = max(dot(t, t), dot(b, b));
  if (size <= 0.0) {
    return n;
  }
  vec3 m = texture(uNormalMap, vUv).xyz * 2.0 - 1.0;
  m.xy *= uNormalScale;
  return normalize(mat3(t / sqrt(size), b / sqrt(size), n) * m);
}

void main() {
  vec4 base = uBase;
  if (uHasTexture) {
    base *= texture(uTexture, vUv);
  }
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uEye - vWorld);
  if (dot(n, v) < 0.0) {
    n = -n;
  }
  if (uHasNormal) {
    n = bumped(n);
  }
  vec2 surface = uHasSurface ? texture(uSurfaceMap, vUv).gb : vec2(1.0);
  float roughness = clamp(uRoughness * surface.x, 0.04, 1.0);
  float metallic = clamp(uMetallic * surface.y, 0.0, 1.0);
  float baked = uHasOcclusion ? mix(1.0, texture(uOcclusionMap, vUv).r, uOcclusionStrength) : 1.0;
  float occlusion = baked * screenOcclusion();
  vec3 f0 = mix(vec3(0.04), base.rgb, metallic);
  float nv = max(dot(n, v), 0.001);
  vec3 color = light(n, v, uKey, uSun, base.rgb, f0, roughness, metallic) * mix(1.0, lit(), uShadows);
  color += light(n, v, normalize(FILL), vec3(uFill), base.rgb, f0, roughness, metallic);
  // What the room gives, by a short form of the usual table of how a rough surface reflects.
  vec4 r = roughness * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
  float a004 = min(r.x * r.x, pow(2.0, -9.28 * nv)) * r.x + r.y;
  vec2 ab = vec2(-1.04, 1.04) * a004 + r.zw;
  vec3 fresnel = f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(1.0 - nv, 5.0);
  vec3 mirrored = uHasEnvironment ? environment(reflect(-v, n), roughness) : room(reflect(-v, n), roughness);
  vec3 around = (uHasEnvironment ? irradiance(n) : room(n, 1.0) * 0.55) * occlusion;
  float toLight = dot(n, uEnvDirection);
  if (uEnvMode == 1) {
    // One large light stands for the environment, so its shadow takes only a part of the light away.
    around *= 1.0 - 0.6 * (1.0 - envShadow()) * smoothstep(0.0, 0.2, toLight);
  } else if (uEnvMode == 2) {
    // The light of this frame, where it reaches the surface, and what the ground throws back onto what faces down.
    around = uEnvLightColor * (toLight > 0.0 ? toLight * envShadow() : 0.0) * baked;
    around += irradiance(vec3(0.0, 1.0, 0.0)) * 0.7 * (0.5 - 0.5 * n.y) * occlusion;
  }
  color += mirrored * (fresnel * ab.x + ab.y) * occlusion;
  color += around * base.rgb * (1.0 - metallic);
  color += uEmissive * (uHasEmissive ? texture(uEmissiveMap, vUv).rgb : vec3(1.0));
  color *= uExposure;
  if (!uStill) {
    color = toScreen(color);
  }
  float seen = base.a;
  if (uMirror.z > 0.0) {
    seen *= uMirror.z * (1.0 - smoothstep(0.0, uMirror.y, uMirror.x - vWorld.y));
  }
  fragment = vec4(color * seen, seen);
}`;

export const DEPTH_FRAGMENT = `#version 300 es
precision highp float;
void main() {}`;
