import type { ShaderProgram } from '../types';

// Grain, as a print or a worn sheet of paper has it: round specks of uneven size that gather in patches, and soft blotches.
// The surface is clear between them, so it lies over the fill of its shape or over what is drawn under it.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uAmount;
uniform float uSize;
uniform float uLight;
uniform float uCloud;
uniform float uClump;
uniform float uVariety;
uniform float uNoise;
uniform float uFollow;
uniform float uSeed;
uniform vec3 uDark;
uniform vec3 uBright;
uniform vec3 uShapeColor;
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

float fbm(vec2 p) {
  float sum = 0.0;
  float weight = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += weight * noise(p);
    p = p * 2.03 + 11.7;
    weight *= 0.5;
  }
  return sum / 0.9375;
}

// One speck per cell at most, round, of its own size and place in the cell; tone says whether it is light.
float specks(vec2 frag, float cellSize, float density, float salt, out float tone) {
  vec2 p = frag / cellSize;
  vec2 cell = floor(p) + salt;
  vec2 f = fract(p);
  tone = hash(cell + 31.0);
  vec2 center = vec2(hash(cell + 7.0), hash(cell + 13.0)) * 0.5 + 0.25;
  float radius = 0.16 + 0.3 * hash(cell + 3.0);
  float disc = 1.0 - smoothstep(radius - 0.1, radius + 0.1, length(f - center));
  return disc * step(1.0 - density, hash(cell)) * (0.5 + 0.5 * hash(cell + 21.0));
}

void main() {
  vec2 q = vUv * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  float amount = clamp(uAmount, 0.0, 1.0);
  // Patches where the print took more ink and patches where it took less.
  float inked = clamp((fbm(q * 3.0 + uSeed * 1.7) - 0.5) * 2.4 + 0.5, 0.0, 1.0);
  float local = amount * mix(1.0, 0.1 + 1.8 * inked, clamp(uClump, 0.0, 1.0));

  // The specks keep their size on the screen, however large the surface is.
  float size = max(uSize, 0.5);
  float fineTone;
  float coarseTone;
  float fine = specks(gl_FragCoord.xy, size * 2.0, clamp(local * 1.4, 0.0, 0.95), 0.0, fineTone);
  float coarse = specks(gl_FragCoord.xy, size * 5.0, clamp(local * 0.45 * uVariety, 0.0, 0.6), 57.0, coarseTone);
  float speck = max(fine, coarse);
  float tone = coarse > fine ? coarseTone : fineTone;

  // On a dark fill the specks lean light, on a light fill dark, as much as follow says.
  float shapeLight = dot(uShapeColor, vec3(0.299, 0.587, 0.114));
  float light = mix(clamp(uLight, 0.0, 1.0), 1.0 - shapeLight, clamp(uFollow, 0.0, 1.0));
  vec3 speckColor = tone < light ? uBright : uDark;
  float speckAlpha = clamp(speck * (0.35 + local * 1.3), 0.0, 1.0);

  float blot = fbm(q * 7.0 + uSeed * 3.1 + 40.0) - 0.5;
  vec3 blotColor = blot > 0.0 ? uBright : uDark;
  float blotAlpha = clamp(abs(blot) * uCloud * (0.4 + local * 1.6), 0.0, 1.0);

  // Noise at every pixel, light or dark at random, stronger where the patches are.
  float grit = hash(gl_FragCoord.xy + 91.0);
  vec3 gritColor = grit > 0.5 ? uBright : uDark;
  float gritAlpha = clamp(pow(abs(grit * 2.0 - 1.0), 1.5) * uNoise * (0.25 + local * 1.5), 0.0, 1.0);

  float under = gritAlpha + blotAlpha * (1.0 - gritAlpha);
  vec3 underColor = gritColor * gritAlpha + blotColor * blotAlpha * (1.0 - gritAlpha);
  float alpha = speckAlpha + under * (1.0 - speckAlpha);
  vec3 color = speckColor * speckAlpha + underColor * (1.0 - speckAlpha);
  gl_FragColor = vec4(color, alpha);
}
`;

export const grainProgram: ShaderProgram = {
  name: 'grain',
  fragmentSource,
  defaultParameters: {
    amount: 0.3,
    size: 1.5,
    light: 0.5,
    cloud: 0.35,
    clump: 0.7,
    variety: 0.5,
    noise: 0.5,
    follow: 0.6,
    seed: 1,
    dark: '#1a1714',
    bright: '#fffaf2',
  },
};
