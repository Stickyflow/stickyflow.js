import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uThickness;
uniform float uBloom;
uniform float uWave;
uniform float uGrain;
uniform float uCornerRadius;
uniform vec3 uBaseColor;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;

float boxMask(vec2 uv) {
  vec2 halfBox = uResolution * 0.5;
  float radius = uCornerRadius * min(uResolution.x, uResolution.y);
  vec2 q = abs(uv * uResolution - halfBox) - halfBox + radius;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  return 1.0 - smoothstep(-1.0, 1.0, d);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float shape = boxMask(vUv);
  if (shape <= 0.0) discard;

  float t = uTime * max(uSpeed, 0.0);
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);

  // The middle of the band wanders across the surface, and its width breathes along the way.
  float middle = 0.5 + uWave * (0.11 * sin(p.x * 3.4 + t) + 0.05 * sin(p.x * 7.1 - t * 1.4));
  float width = max(uThickness, 0.002) * (0.65 + 0.35 * sin(p.x * 2.4 + t * 0.6));
  float offset = (p.y - middle) * aspect * 0.6;
  float core = exp(-pow(offset / width, 2.0));
  float halo = exp(-pow(offset / (width * (2.5 + uBloom * 5.0)), 2.0));

  // Blue at one end, pink at the other, and the colors drift a little.
  float along = clamp(p.x + 0.12 * sin(t * 0.8), 0.0, 1.0);
  vec3 tint = along < 0.5 ? mix(uColorA, uColorB, along * 2.0) : mix(uColorB, uColorC, along * 2.0 - 1.0);
  float pulse = 0.6 + 0.4 * sin(p.x * 6.0 - t * 2.0);

  vec3 color = uBaseColor;
  color += tint * halo * 0.55 * pulse * max(uBloom, 0.0);
  color += mix(tint, vec3(1.0), 0.55) * core * (0.55 + 0.45 * pulse);
  color *= max(uIntensity, 0.0);
  color += (hash(gl_FragCoord.xy + t) - 0.5) * max(uGrain, 0.0);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), shape);
}
`;

export const lightBandProgram: ShaderProgram = {
  name: 'lightBand',
  fragmentSource,
  defaultParameters: {
    speed: 0.3,
    intensity: 1,
    thickness: 0.035,
    bloom: 1,
    wave: 1,
    grain: 0.02,
    cornerRadius: 0.02,
    baseColor: '#0f0e14',
    colorA: '#7ea8ff',
    colorB: '#c13fd6',
    colorC: '#ff6fb8',
  },
};
