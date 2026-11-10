// Pieces that several shaders share.

export const SHADOW_LOOKUP = `
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
