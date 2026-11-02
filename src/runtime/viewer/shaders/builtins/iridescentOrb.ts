import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uFlow;
uniform float uBands;
uniform float uDepth;
uniform float uRim;
uniform vec3 uColor;
uniform vec3 uCool;
uniform vec3 uWarm;
uniform vec3 uHot;
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  float time = uTime * uSpeed;

  // A sphere, so the color slides around its edge.
  float z = sqrt(max(0.0, 1.0 - radius * radius));
  vec2 q = p / (0.55 + z * uDepth);

  // The place is pushed along by waves of itself, which folds the color like oil on water.
  vec2 w = q;
  for (int i = 0; i < 4; i++) {
    float step = float(i) + 1.0;
    w += uFlow * vec2(sin(w.y * 1.7 * step + time * 1.1), cos(w.x * 1.5 * step - time * 0.9)) / step;
  }
  float bands = sin((w.x + w.y) * uBands + time);
  float second = sin((w.x - w.y) * uBands * 1.5 - time * 0.7);

  vec3 color = mix(uCool, uHot, smoothstep(-0.2, 0.9, second));
  color = mix(color, uWarm, smoothstep(0.1, 0.8, bands * second));
  float light = smoothstep(-0.95, 0.15, bands);
  color = mix(uColor, color, light);
  color += vec3(1.0) * pow(max(0.0, bands), 14.0) * 0.55;

  // Dark toward the rim, with a thin line of light on it.
  color *= 0.3 + 0.7 * smoothstep(0.0, 0.55, z);
  color += mix(uCool, uHot, vUv.y) * exp(-pow((radius - 0.965) / 0.025, 2.0)) * uRim;

  float alpha = 1.0 - smoothstep(0.985, 1.0, radius);
  gl_FragColor = vec4(clamp(color * uIntensity, 0.0, 1.0) * alpha, alpha);
}
`;

export const iridescentOrbProgram: ShaderProgram = {
  name: 'iridescentOrb',
  fragmentSource,
  defaultParameters: {
    speed: 0.25,
    intensity: 1.1,
    flow: 0.3,
    bands: 1.7,
    depth: 0.75,
    rim: 0.7,
    color: '#04060f',
    cool: '#1f6bff',
    warm: '#ff8a2b',
    hot: '#d946ef',
  },
};
