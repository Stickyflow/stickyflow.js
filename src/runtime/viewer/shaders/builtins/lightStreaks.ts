import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uWidth;
uniform float uGrain;
uniform float uGlassX;
uniform float uGlassY;
uniform float uGlassWidth;
uniform float uGlassHeight;
uniform float uGlassRadius;
uniform float uGlassBlur;
uniform vec3 uColor;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uHot;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Long curves of light in a color of their own. The core is the white line in the middle of each.
vec3 streaks(vec2 p, float time, float spread, float core) {
  vec3 light = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float n = float(i);
    float angle = 0.9 + n * 0.83;
    vec2 q = vec2(cos(angle) * p.x + sin(angle) * p.y, cos(angle) * p.y - sin(angle) * p.x);
    float curve = sin(q.x * (1.1 + n * 0.17) + time * (0.5 + n * 0.07) + n * 2.1) * (0.32 - n * 0.02);
    curve += sin(q.x * 2.7 - time * 0.4 + n) * 0.06;
    float d = abs(q.y - curve + (n - 3.0) * 0.16);
    float width = uWidth * spread * (0.55 + 0.45 * sin(q.x * 1.6 + n * 1.3 + time * 0.3));
    float halo = width / (d + width);
    vec3 tint = mod(n, 3.0) < 0.5 ? uCool : (mod(n, 3.0) < 1.5 ? uHot : uWarm);
    light += tint * halo * halo + vec3(exp(-pow(d / (width * 0.3), 2.0))) * core;
  }
  return light;
}

float roundedBox(vec2 p, vec2 half_, float radius) {
  vec2 d = abs(p) - half_ + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

void main() {
  float time = uTime * uSpeed;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((vUv.x * 2.0 - 1.0) * aspect, vUv.y * 2.0 - 1.0);
  vec3 color = uColor + (streaks(p, time, 1.0, 0.6) + streaks(p, time, 7.0, 0.0) * 0.28) * uIntensity;

  // A pane of frosted glass.
  if (uGlassWidth > 0.0) {
    vec2 pixel = vec2(vUv.x, 1.0 - vUv.y) * uResolution;
    vec2 center = (vec2(uGlassX, uGlassY) + vec2(uGlassWidth, uGlassHeight) * 0.5) * uResolution;
    vec2 half_ = vec2(uGlassWidth, uGlassHeight) * 0.5 * uResolution;
    float radius = uGlassRadius * uResolution.y;
    float box = roundedBox(pixel - center, half_, radius);
    if (box < 1.0) {
      // Through the glass each curve is only its wide glow.
      vec3 frosted = uColor * 1.4 + streaks(p, time, 1.0 + uGlassBlur * 110.0, 0.0) * uIntensity * 0.24;
      vec3 pane = mix(frosted, vec3(1.0), 0.05 + 0.05 * vUv.y);
      color = mix(pane, color, smoothstep(-1.0, 1.0, box));
    }
    color += vec3(0.5) * (1.0 - smoothstep(0.0, 1.4, abs(box)));
  }

  color += (hash(vUv * uResolution) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

export const lightStreaksProgram: ShaderProgram = {
  name: 'lightStreaks',
  fragmentSource,
  defaultParameters: {
    speed: 0.2,
    intensity: 1,
    width: 0.03,
    grain: 0.02,
    glassX: 0,
    glassY: 0,
    glassWidth: 0,
    glassHeight: 0,
    glassRadius: 0.03,
    glassBlur: 0.16,
    color: '#04040a',
    cool: '#2563ff',
    warm: '#ff7a2f',
    hot: '#e0359f',
  },
};
