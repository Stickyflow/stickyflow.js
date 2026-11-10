// Pieces that several shaders share.

// How much of the sun reaches a point. With a softness the edge of a shadow widens with the distance to what casts it: first the
// map is searched for what lies between the point and the sun, then the edge is blurred by as much as that distance gives.
export const SHADOW_LOOKUP = `
uniform highp sampler2DShadow uShadow;
uniform highp sampler2D uShadowDepth;
// How wide the edge gets, in parts of the map, for each part of its depth between the point and what casts the shadow.
uniform float uShadowSoftness;
in vec4 vShadow;
const float SHADOW_BIAS = 0.0015;

// A point of a disc, spread evenly by the golden angle and turned by the angle of the pixel.
vec2 spiral(int i, int count, float angle) {
  float r = sqrt((float(i) + 0.5) / float(count));
  float theta = float(i) * 2.39996 + angle;
  return vec2(cos(theta), sin(theta)) * r;
}

float sharpLit(vec3 p) {
  float sum = 0.0;
  vec2 step = 1.0 / vec2(textureSize(uShadow, 0));
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      sum += texture(uShadow, vec3(p.xy + vec2(x, y) * step, p.z - SHADOW_BIAS));
    }
  }
  return sum / 25.0;
}

float softLit(vec3 p) {
  float texel = 1.0 / float(textureSize(uShadow, 0).x);
  // A noise that changes in a fine, even pattern from pixel to pixel, so the turned discs blur into a smooth edge.
  float angle = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
  float search = clamp(uShadowSoftness * p.z, texel * 2.0, 0.08);
  float blockers = 0.0;
  float found = 0.0;
  for (int i = 0; i < 16; i++) {
    float depth = texture(uShadowDepth, p.xy + spiral(i, 16, angle) * search).r;
    if (depth < p.z - SHADOW_BIAS) {
      blockers += depth;
      found += 1.0;
    }
  }
  if (found == 0.0) {
    return 1.0;
  }
  float width = max((p.z - blockers / found) * uShadowSoftness, texel * 1.5);
  float bias = SHADOW_BIAS + width * 0.5;
  float sum = 0.0;
  for (int i = 0; i < 32; i++) {
    sum += texture(uShadow, vec3(p.xy + spiral(i, 32, angle) * width, p.z - bias));
  }
  return sum / 32.0;
}

float lit() {
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  return uShadowSoftness > 0.0 ? softLit(p) : sharpLit(p);
}`;

// In a still picture each frame stands for one direction of the light of the environment, picked by how bright it is. Whether that
// light reaches a point is read from a map of its own; frames added up give the soft shadow of the whole environment. A surface
// that faces away from the direction learns nothing from it.
export const ENVIRONMENT_SHADOW_LOOKUP = `
uniform bool uHasEnvShadow;
uniform highp sampler2DShadow uEnvShadow;
uniform vec3 uEnvDirection;
in vec4 vEnvShadow;
float envVisible(vec3 n) {
  float facing = smoothstep(0.0, 0.2, dot(n, uEnvDirection));
  if (!uHasEnvShadow || facing <= 0.0) {
    return 1.0;
  }
  vec3 p = vEnvShadow.xyz / vEnvShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  vec2 step = 1.0 / vec2(textureSize(uEnvShadow, 0));
  float sum = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      sum += texture(uEnvShadow, vec3(p.xy + vec2(x, y) * step, p.z - 0.002));
    }
  }
  return mix(1.0, sum / 9.0, facing);
}`;

// How much of the sky a pixel sees, worked out for the whole picture before the meshes are drawn. 1 where nothing is near.
export const SCREEN_OCCLUSION = `
uniform bool uHasScreenOcclusion;
uniform sampler2D uScreenOcclusion;
uniform vec2 uScreen;
float screenOcclusion() {
  return uHasScreenOcclusion ? texture(uScreenOcclusion, gl_FragCoord.xy / uScreen).r : 1.0;
}`;

// The environment is an equirectangular picture: v runs from straight up to straight down, u once around, from behind.
export const ENVIRONMENT_LOOKUP = `
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
