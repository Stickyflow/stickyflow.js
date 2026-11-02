import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uHeight;
uniform float uBowl;
uniform float uSoftness;
uniform float uGrain;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uHighlight;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float time = uTime * uSpeed;
  float x = vUv.x * 2.0 - 1.0;
  // The dark sits in a bowl over the bottom edge, and the light climbs up on both sides of it.
  float edge = uHeight + uBowl * x * x + sin(x * 3.0 + time) * 0.015 + sin(x * 7.0 - time * 1.3) * 0.006;
  float depth = edge - vUv.y;
  float light = smoothstep(-uSoftness, uSoftness * 0.25, depth);
  float inner = smoothstep(0.0, uSoftness * 1.2, depth);
  vec3 color = mix(uColor, uAccent, light * (0.75 + 0.1 * sin(time * 0.7)));
  color = mix(color, uHighlight, inner * 0.85);
  color = clamp(color * uIntensity, 0.0, 1.0);
  // Noise, so the long fade shows no steps.
  color += (hash(vUv * uResolution + fract(time)) - 0.5) * uGrain;
  gl_FragColor = vec4(color, 1.0);
}
`;

export const horizonGlowProgram: ShaderProgram = {
  name: 'horizonGlow',
  fragmentSource,
  defaultParameters: {
    speed: 0.3,
    intensity: 1,
    height: 0.08,
    bowl: 0.42,
    softness: 0.42,
    grain: 0.018,
    color: '#030816',
    accent: '#0b4fd6',
    highlight: '#7fd8ff',
  },
};
