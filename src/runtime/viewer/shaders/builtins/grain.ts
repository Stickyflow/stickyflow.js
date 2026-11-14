import type { ShaderProgram } from '../types';

// Grain, as a print or a sheet of paper has it: light and dark specks and a soft cloud of unevenness, and nothing else.
// The surface is clear between them, so it lies over what is drawn under it and gives it the texture of the paper.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uAmount;
uniform float uSize;
uniform float uLight;
uniform float uCloud;
uniform float uSeed;
uniform vec3 uDark;
uniform vec3 uBright;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed * 0.1031);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  // The specks keep their size on the screen, however large the surface is.
  float size = max(uSize, 0.5);
  vec2 cell = floor(gl_FragCoord.xy / size);
  float speck = hash(cell);
  float second = hash(cell + 17.0);
  // How much the paper is uneven here, slowly over the surface.
  float cloud = noise(vUv * vec2(uResolution.x / uResolution.y, 1.0) * 6.0) - 0.5;

  float light = clamp(uLight, 0.0, 1.0);
  float amount = clamp(uAmount, 0.0, 1.0);
  // A speck is drawn where its number is far from the middle: the more amount, the more of them.
  float strength = smoothstep(1.0 - amount, 1.0, abs(speck * 2.0 - 1.0)) * (0.55 + 0.45 * second);
  bool bright = second < light;
  vec3 color = bright ? uBright : uDark;
  float alpha = clamp(strength * amount * 2.2 + abs(cloud) * uCloud * amount, 0.0, 1.0);
  vec3 cloudColor = cloud > 0.0 ? uBright : uDark;
  color = mix(cloudColor, color, step(0.001, strength));
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const grainProgram: ShaderProgram = {
  name: 'grain',
  fragmentSource,
  defaultParameters: {
    amount: 0.18,
    size: 1.5,
    light: 0.5,
    cloud: 0.35,
    seed: 1,
    dark: '#1a1714',
    bright: '#fffaf2',
  },
};
