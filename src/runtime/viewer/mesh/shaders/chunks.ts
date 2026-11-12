// Pieces that several shaders share.

// How much of the sun reaches a point. With a softness the edge of a shadow widens with the distance to what casts it: first the
// map is searched for what lies between the point and the sun, then the edge is blurred by as much as that distance gives.
export const SHADOW_LOOKUP = `
uniform highp sampler2DShadow uShadow;
uniform highp sampler2D uShadowDepth;
// How wide the edge gets, in parts of the map, for each part of its depth between the point and what casts the shadow.
uniform float uShadowSoftness;
uniform float uShadowGrain;
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

// A shadow whose edge widens with the distance to what casts it, read from a map and the same map as plain distances.
float softVisible(highp sampler2DShadow map, highp sampler2D depths, vec3 p, float softness, float grain) {
  float texel = 1.0 / float(textureSize(map, 0).x);
  // A noise that changes in a fine, even pattern from pixel to pixel, so the turned discs blur into a smooth edge.
  float angle = grain * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * 6.2831853;
  // Without the turn from pixel to pixel the samples lie in one pattern, which only a narrow edge hides. So a picture that moves
  // has narrower edges than the still one.
  float widest = grain > 0.5 ? 1.0 : texel * 9.0;
  if (grain < 0.5) {
    // An edge of one width everywhere: looking for what casts the shadow, with samples in one pattern, would leave patches.
    float even = 0.0;
    for (int i = 0; i < 32; i++) {
      even += texture(map, vec3(p.xy + spiral(i, 32, 0.0) * widest, p.z - SHADOW_BIAS - widest * 0.5));
    }
    return even / 32.0;
  }
  float search = clamp(softness * p.z, texel * 2.0, min(0.08, widest * 2.5));
  float blockers = 0.0;
  float found = 0.0;
  for (int i = 0; i < 16; i++) {
    float depth = texture(depths, p.xy + spiral(i, 16, angle) * search).r;
    if (depth < p.z - SHADOW_BIAS) {
      blockers += depth;
      found += 1.0;
    }
  }
  if (found == 0.0) {
    return 1.0;
  }
  float width = min(max((p.z - blockers / found) * softness, texel * 1.5), widest);
  float bias = SHADOW_BIAS + width * 0.5;
  float sum = 0.0;
  for (int i = 0; i < 32; i++) {
    sum += texture(map, vec3(p.xy + spiral(i, 32, angle) * width, p.z - bias));
  }
  return sum / 32.0;
}

float lit() {
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  return uShadowSoftness > 0.0 ? softVisible(uShadow, uShadowDepth, p, uShadowSoftness, uShadowGrain) : sharpLit(p);
}`;

// The shadow of the light of the environment, from a map of its own. While the picture moves (mode 1), one large light stands for
// the whole environment and its shadow is soft. In a still picture (mode 2) each frame shows one light of the environment, picked
// as often as it is bright, and the frames added up give the light and the shadows of all of them. It needs the shadow lookup of
// the sun before it.
export const ENVIRONMENT_SHADOW_LOOKUP = `
uniform int uEnvMode;
uniform highp sampler2DShadow uEnvShadow;
uniform highp sampler2D uEnvShadowDepth;
uniform float uEnvShadowSoftness;
uniform float uEnvShadowGrain;
uniform vec3 uEnvDirection;
// In a still picture: what the light of this frame gives a matte surface that faces it.
uniform vec3 uEnvLightColor;
// How much the shadow of this light counts on the ground.
uniform float uEnvGround;
in vec4 vEnvShadow;
// How much of the light of this frame reaches the point: 1 where nothing is in the way, or where the map does not reach.
float envShadow() {
  vec3 p = vEnvShadow.xyz / vEnvShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) {
    return 1.0;
  }
  if (uEnvShadowSoftness > 0.0) {
    return softVisible(uEnvShadow, uEnvShadowDepth, p, uEnvShadowSoftness, uEnvShadowGrain);
  }
  vec2 step = 1.0 / vec2(textureSize(uEnvShadow, 0));
  float sum = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      sum += texture(uEnvShadow, vec3(p.xy + vec2(x, y) * step, p.z - 0.002));
    }
  }
  return sum / 9.0;
}`;

// From light to what a screen shows: a filmic curve, which keeps colors in what is bright where a simple one turns them pale, and
// the way back, for colors that are put among light. Written so that the older form of the language reads it too.
export const TONE_CURVE = `
vec3 toneCurve(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 toScreen(vec3 light) {
  return pow(toneCurve(max(light, vec3(0.0))), vec3(1.0 / 2.2));
}
vec3 fromScreen(vec3 color) {
  vec3 y = min(pow(color, vec3(2.2)), vec3(0.999));
  vec3 a = 2.51 - 2.43 * y;
  vec3 b = 0.03 - 0.59 * y;
  return (-b + sqrt(b * b + 0.56 * a * y)) / (2.0 * a);
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
