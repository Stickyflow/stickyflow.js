export const VERTEX = `#version 300 es
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormal;
uniform mat4 uLight;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out vec4 vShadow;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorld = world.xyz;
  vNormal = uNormal * aNormal;
  vUv = aUv;
  vShadow = uLight * world;
  gl_Position = uViewProjection * world;
}`;

const SHADOW_LOOKUP = `
uniform highp sampler2DShadow uShadow;
in vec4 vShadow;
float lit() {
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  float sum = 0.0;
  vec2 step = 1.0 / vec2(textureSize(uShadow, 0));
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      sum += texture(uShadow, vec3(p.xy + vec2(x, y) * step, p.z - 0.0015));
    }
  }
  return sum / 25.0;
}`;

// How much of the sky a pixel sees, worked out for the whole picture before the meshes are drawn. 1 where nothing is near.
const SCREEN_OCCLUSION = `
uniform bool uHasScreenOcclusion;
uniform sampler2D uScreenOcclusion;
uniform vec2 uScreen;
float screenOcclusion() {
  return uHasScreenOcclusion ? texture(uScreenOcclusion, gl_FragCoord.xy / uScreen).r : 1.0;
}`;

// The environment is an equirectangular picture: v runs from straight up to straight down, u once around, from behind.
const ENVIRONMENT_LOOKUP = `
vec3 turned(vec3 d, vec2 turn) {
  return vec3(turn.x * d.x - turn.y * d.z, d.y, turn.y * d.x + turn.x * d.z);
}
vec2 equirect(vec3 d) {
  return vec2(atan(d.x, -d.z) / (2.0 * PI) + 0.5, acos(clamp(d.y, -1.0, 1.0)) / PI);
}
vec3 fromEquirect(vec2 uv) {
  float theta = uv.y * PI;
  float phi = (uv.x - 0.5) * 2.0 * PI;
  return vec3(sin(theta) * sin(phi), cos(theta), -sin(theta) * cos(phi));
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
${SCREEN_OCCLUSION}
out vec4 fragment;
${SHADOW_LOOKUP}
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

// A filmic curve, which keeps colors in what is bright where a simple one turns them pale.
vec3 filmic(vec3 x) {
  x *= 0.45;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

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
  float occlusion = uHasOcclusion ? mix(1.0, texture(uOcclusionMap, vUv).r, uOcclusionStrength) : 1.0;
  occlusion *= screenOcclusion();
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
  vec3 around = uHasEnvironment ? irradiance(n) : room(n, 1.0) * 0.55;
  color += mirrored * (fresnel * ab.x + ab.y) * occlusion;
  color += around * base.rgb * (1.0 - metallic) * occlusion;
  color += uEmissive * (uHasEmissive ? texture(uEmissiveMap, vUv).rgb : vec3(1.0));
  color = filmic(color);
  color = pow(color, vec3(1.0 / 2.2));
  fragment = vec4(color * base.a, base.a);
}`;

export const DEPTH_FRAGMENT = `#version 300 es
precision highp float;
void main() {}`;

// What lies under a pixel: which mesh in two channels, and how far away in two more.
export const PROBE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uEye;
uniform float uRange;
uniform vec2 uId;
out vec4 fragment;
void main() {
  float far = clamp(length(vWorld - uEye) / uRange, 0.0, 1.0) * 65535.0;
  fragment = vec4(uId, floor(far / 256.0) / 255.0, mod(floor(far), 256.0) / 255.0);
}`;

// Only the shadow is drawn, so the page stays visible where there is none.
export const GROUND_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCenter;
uniform float uFade;
uniform float uStrength;
uniform float uGrid;
uniform float uCell;
uniform float uReach;
uniform mat4 uStage;
${SCREEN_OCCLUSION}
out vec4 fragment;
${SHADOW_LOOKUP}
// Lines one pixel wide at every cell, whatever the distance.
float lines(vec2 at, float cell) {
  vec2 cells = at / cell;
  vec2 width = fwidth(cells);
  vec2 line = abs(fract(cells - 0.5) - 0.5) / width;
  return 1.0 - min(min(line.x, line.y), 1.0);
}
void main() {
  float distance = length(vWorld.xz - uCenter.xz);
  float fade = 1.0 - smoothstep(uFade * 0.6, uFade, distance);
  float shadow = uStrength > 0.0 ? (1.0 - lit()) * 0.32 * fade * uStrength : 0.0;
  // Where something stands on the ground, the ground gets darker toward it.
  shadow = 1.0 - (1.0 - shadow) * (1.0 - (1.0 - screenOcclusion()) * 0.75 * fade);
  float grid = 0.0;
  if (uGrid > 0.5) {
    vec2 at = vWorld.xz;
    grid = max(lines(at, uCell) * 0.16, lines(at, uCell * 10.0) * 0.32) * (1.0 - smoothstep(uReach * 0.3, uReach, distance));
    // It runs out before the edges of the Scene, so it never ends in a hard line.
    vec4 seen = uStage * vec4(vWorld, 1.0);
    vec2 edge = seen.w > 0.0 ? abs(seen.xy / seen.w) : vec2(1.0);
    grid *= (1.0 - smoothstep(0.7, 0.97, edge.x)) * (1.0 - smoothstep(0.7, 0.97, edge.y));
  }
  // Grey lines under the shadow, with the alpha premultiplied as the page expects.
  float alpha = shadow + grid * (1.0 - shadow);
  vec3 color = vec3(0.5) * grid * (1.0 - shadow);
  fragment = vec4(color, alpha);
}`;

export const PLANE_VERTEX = `attribute vec2 aPosition;
uniform mat4 uMvp;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = uMvp * vec4(aPosition, 0.0, 1.0);
}`;

export const PLANE_FRAGMENT = `precision highp float;
uniform sampler2D uPicture;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uPicture, vUv);
  if (color.a < 0.004) {
    discard;
  }
  gl_FragColor = color;
}`;

export const SCREEN_VERTEX = `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// One level of the environment as a rough surface sees it: many directions around the mirror one, weighted as such a surface
// reflects. Each is read from a smaller copy of the picture the less often it is chosen, so few of them still give a smooth result.
export const PREFILTER_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform float uRoughness;
uniform float uTexel;
out vec4 fragment;
const float PI = 3.14159265;
const int SAMPLES = 256;
${ENVIRONMENT_LOOKUP}

vec2 hammersley(int i) {
  uint bits = uint(i);
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return vec2(float(i) / float(SAMPLES), float(bits) * 2.3283064365386963e-10);
}

void main() {
  vec3 n = fromEquirect(vUv);
  if (uRoughness <= 0.0) {
    fragment = vec4(textureLod(uSource, vUv, 0.0).rgb, 1.0);
    return;
  }
  vec3 helper = abs(n.y) < 0.999 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(helper, n));
  vec3 bitangent = cross(n, tangent);
  float a = uRoughness * uRoughness;
  float a2 = a * a;
  vec3 sum = vec3(0.0);
  float weight = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    vec2 xi = hammersley(i);
    float phi = 2.0 * PI * xi.x;
    float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a2 - 1.0) * xi.y));
    float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
    vec3 h = normalize(tangent * cos(phi) * sinTheta + bitangent * sin(phi) * sinTheta + n * cosTheta);
    vec3 l = 2.0 * dot(n, h) * h - n;
    float nl = dot(n, l);
    if (nl <= 0.0) {
      continue;
    }
    float nh = max(dot(n, h), 0.0);
    float d = a2 / (PI * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0));
    float pdf = d / 4.0 + 0.0001;
    float solid = 1.0 / (float(SAMPLES) * pdf);
    float lod = max(0.5 * log2(solid / uTexel) + 1.0, 0.0);
    sum += textureLod(uSource, equirect(l), lod).rgb * nl;
    weight += nl;
  }
  fragment = vec4(sum / max(weight, 0.0001), 1.0);
}`;

// For each pixel: which way its surface faces, and how far it is from the eye.
export const GEOMETRY_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 uEye;
uniform vec4 uFlat;
out vec4 fragment;
void main() {
  vec3 n = uFlat.w > 0.5 ? uFlat.xyz : normalize(vNormal);
  vec3 toEye = uEye - vWorld;
  if (dot(n, toEye) < 0.0) {
    n = -n;
  }
  fragment = vec4(n, length(toEye));
}`;

// Points in the half sphere over a surface: the more of them lie behind what the eye sees there, the less light reaches it.
export const OCCLUSION_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uGeometry;
uniform mat4 uInverse;
uniform mat4 uViewProjection;
uniform vec3 uEye;
uniform float uRadius;
uniform vec3 uKernel[16];
out vec4 fragment;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 here = texture(uGeometry, vUv);
  if (here.a <= 0.0) {
    fragment = vec4(1.0);
    return;
  }
  vec4 far = uInverse * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 ray = normalize(far.xyz / far.w - uEye);
  vec3 p = uEye + ray * here.a;
  vec3 n = here.xyz;
  float angle = hash(gl_FragCoord.xy) * 6.2831853;
  vec3 turn = vec3(cos(angle), sin(angle), cos(angle * 1.7));
  vec3 t = turn - n * dot(turn, n);
  t = dot(t, t) < 1e-4 ? normalize(cross(n, vec3(0.0, 0.0, 1.0))) : normalize(t);
  vec3 b = cross(n, t);
  float hidden = 0.0;
  for (int i = 0; i < 16; i++) {
    vec3 k = uKernel[i];
    vec3 s = p + (t * k.x + b * k.y + n * k.z) * uRadius;
    vec4 clip = uViewProjection * vec4(s, 1.0);
    if (clip.w <= 0.0) {
      continue;
    }
    vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      continue;
    }
    float seen = texture(uGeometry, uv).a;
    if (seen <= 0.0) {
      continue;
    }
    float own = length(s - uEye);
    // What is far in front only counts a little, so an edge does not throw a dark halo on what lies behind it.
    float near = smoothstep(0.0, 1.0, uRadius / max(abs(here.a - seen), 1e-5));
    hidden += (seen < own - uRadius * 0.04 ? 1.0 : 0.0) * near;
  }
  fragment = vec4(vec3(pow(1.0 - hidden / 16.0, 2.6)), 1.0);
}`;

// A blur that stays on its own surface: neighbours at another distance from the eye count for little.
export const OCCLUSION_BLUR_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uRaw;
uniform sampler2D uGeometry;
uniform vec2 uTexel;
out vec4 fragment;
void main() {
  float depth = texture(uGeometry, vUv).a;
  if (depth <= 0.0) {
    fragment = vec4(1.0);
    return;
  }
  float sum = 0.0;
  float weight = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 at = vUv + vec2(x, y) * uTexel;
      float other = texture(uGeometry, at).a;
      float w = other > 0.0 ? exp(-abs(other - depth) / (depth * 0.01)) : 0.0;
      sum += texture(uRaw, at).r * w;
      weight += w;
    }
  }
  fragment = vec4(vec3(weight > 0.0 ? sum / weight : 1.0), 1.0);
}`;
