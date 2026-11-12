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
// Changes the pattern of the noise, so the frames of a still picture add up to a smooth result.
uniform float uSeed;
out vec4 fragment;

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
  // Sixteen turns in a pattern of four by four pixels. The blur afterwards takes four by four pixels together, so every turn
  // counts once in each of them and no grain is left.
  ivec2 cell = ivec2(gl_FragCoord.xy) & 3;
  float angle = (float(cell.x * 4 + ((cell.y * 3 + cell.x) & 3)) + 0.5) / 16.0 * 6.2831853 + uSeed * 2.399963;
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
  for (int x = -2; x <= 1; x++) {
    for (int y = -2; y <= 1; y++) {
      vec2 at = vUv + (vec2(x, y) + 0.5) * uTexel;
      float other = texture(uGeometry, at).a;
      float w = other > 0.0 ? exp(-abs(other - depth) / (depth * 0.01)) : 0.0;
      sum += texture(uRaw, at).r * w;
      weight += w;
    }
  }
  fragment = vec4(vec3(weight > 0.0 ? sum / weight : 1.0), 1.0);
}`;
