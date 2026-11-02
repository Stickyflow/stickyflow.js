import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uWidth;
uniform float uWarp;
uniform float uGrain;
uniform vec3 uColor;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uHot;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float time = uTime * uSpeed;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2((vUv.x * 2.0 - 1.0) * aspect, vUv.y * 2.0 - 1.0);
  // The space itself flows, so the ribbons bend together like a liquid.
  p += uWarp * 0.42 * vec2(sin(p.y * 1.3 + time * 0.6), sin(p.x * 1.1 - time * 0.5));
  p += uWarp * 0.16 * vec2(sin(p.y * 2.9 - time * 0.4 + 1.0), sin(p.x * 2.3 + time * 0.3 + 2.0));

  vec3 light = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float n = float(i);
    float angle = 0.7 + n * 0.97;
    vec2 q = vec2(cos(angle) * p.x + sin(angle) * p.y, cos(angle) * p.y - sin(angle) * p.x);
    float curve = sin(q.x * (0.7 + n * 0.11) + time * (0.4 + n * 0.05) + n * 2.1) * 0.46;
    curve += sin(q.x * 1.8 - time * 0.3 + n * 1.3) * 0.11 + (n - 3.0) * 0.2;
    float side = q.y - curve;

    // A ribbon swells and runs out along its length.
    float life = pow(0.5 + 0.5 * sin(q.x * (0.85 + n * 0.17) + n * 1.7 - time * 0.35), 2.6);
    float width = uWidth * (0.25 + 1.75 * life);

    // One side ends sharply, and the other falls away slowly, like the fold of a satin.
    float fall = side < 0.0 ? exp(side / (width * 0.45)) : exp(-side / (width * 4.0));
    float core = exp(-pow(side / (width * 0.16), 2.0)) * life * life;
    float phase = 0.5 + 0.5 * sin(q.x * 1.15 + n * 2.0 + time * 0.2);
    vec3 tint = phase < 0.5 ? mix(uCool, uHot, phase * 2.0) : mix(uHot, uWarm, phase * 2.0 - 1.0);
    light += tint * tint * fall * life * 1.3 + vec3(1.0) * core * 0.75 + tint * tint * exp(-abs(side) / 0.4) * life * 0.05;
  }

  // Light adds up softly and keeps its color, instead of ending in a hard white.
  vec3 color = uColor + (1.0 - exp(-light * uIntensity * 1.15));
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
    width: 0.04,
    warp: 1,
    grain: 0.02,
    color: '#04040a',
    cool: '#2a6bff',
    warm: '#ff5a1f',
    hot: '#b02cff',
  },
};
