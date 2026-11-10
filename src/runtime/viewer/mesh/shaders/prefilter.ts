import { ENVIRONMENT_LOOKUP } from './chunks';

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
