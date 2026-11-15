import type { ShaderProgram } from '../types';

// Paper that has lived: ink flaked off down to the paper, a net of cracks, folds, stains, scratches and browned edges.
// The surface is clear where the print is whole, so it lies over the fill of its shape. Its marks scale with the drawing.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uPixelScale;
uniform float uWear;
uniform float uCracks;
uniform float uFolds;
uniform float uStains;
uniform float uEdge;
uniform float uScratches;
uniform float uScale;
uniform float uSeed;
uniform vec3 uPaper;
uniform vec3 uDark;
uniform vec3 uStain;
uniform vec3 uShapeColor;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed * 0.1031);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + 19.19));
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
  for (int i = 0; i < 5; i++) {
    sum += weight * noise(p);
    p = p * 2.03 + 11.7;
    weight *= 0.5;
  }
  return sum / 0.96875;
}

// How far a point is from the border between two cells: small on the cracks.
float cellBorder(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float nearest = 8.0;
  float second = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 r = g + hash2(i + g) - f;
      float d = dot(r, r);
      if (d < nearest) {
        second = nearest;
        nearest = d;
      } else if (d < second) {
        second = d;
      }
    }
  }
  return sqrt(second) - sqrt(nearest);
}

void over(inout vec4 acc, vec3 color, float alpha) {
  float a = clamp(alpha, 0.0, 1.0);
  acc = vec4(color * a + acc.rgb * (1.0 - a), a + acc.a * (1.0 - a));
}

void main() {
  float pixel = max(uPixelScale, 0.0001);
  float scale = max(uScale, 0.1);
  vec2 size = uResolution / pixel;
  vec2 at = vUv * size;
  vec2 p = at / (140.0 * scale);
  vec2 warp = vec2(fbm(p * 1.7 + uSeed), fbm(p * 1.7 + uSeed + 5.3)) - 0.5;

  // On a light fill the marks are dark, on a dark fill they are the paper.
  float light = dot(uShapeColor, vec3(0.299, 0.587, 0.114));
  vec3 mark = light > 0.5 ? uDark : uPaper;

  vec4 acc = vec4(0.0);

  float blot = fbm(p * 0.8 + 21.0 + uSeed);
  float stain = smoothstep(1.0 - uStains * 0.5, 1.0 - uStains * 0.5 + 0.1, blot);
  float rim = stain * (1.0 - stain) * 4.0;
  over(acc, uStain, stain * 0.28 + rim * 0.3);

  // Ink flaked off in patches with torn edges.
  float tear = noise(at / (2.5 * scale) + uSeed * 7.0) * 0.07;
  float flake = smoothstep(0.0, 0.025, fbm(p * 1.4 + warp * 1.3 + uSeed * 2.0) + tear - (0.92 - uWear * 0.5));
  // Small chips gather where the print is already worn.
  float near = smoothstep(0.42, 0.62, fbm(p * 2.2 + 40.0 + uSeed));
  float rough = noise(at / (4.0 * scale) + uSeed * 3.0) * 0.65 + noise(at / (1.4 * scale) + 50.0) * 0.35;
  float chip = smoothstep(0.76 - uWear * 0.1, 0.79 - uWear * 0.1, rough) * near;
  over(acc, uPaper, max(flake, chip));

  // A net of cracks where the paper was bent, coarse and fine.
  float region = smoothstep(1.0 - uCracks, 1.0 - uCracks + 0.2, fbm(p * 0.9 + 9.0 + uSeed));
  float coarse = 1.0 - smoothstep(0.0, 0.03, cellBorder(p * 2.6 + warp * 0.9));
  float fine = 1.0 - smoothstep(0.0, 0.05, cellBorder(p * 7.0 + warp * 1.6 + 3.0));
  over(acc, mark, region * (coarse * 0.85 + fine * 0.45));

  // Folds straight across, each a bright ridge with a dark side.
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float across = step(0.5, hash(vec2(fk + 7.0, 3.0)));
    float place = 0.15 + 0.7 * hash(vec2(fk, 11.0));
    float along = mix(vUv.y, vUv.x, across);
    float coord = mix(vUv.x, vUv.y, across);
    float wobble = (noise(vec2(along * 30.0, fk * 5.0 + uSeed)) - 0.5) * 0.006;
    float gap = (coord - place - wobble) * mix(size.x, size.y, across);
    float shown = step(fk + 0.5, uFolds * 3.0);
    over(acc, uPaper, shown * (1.0 - smoothstep(0.4, 1.4, abs(gap))) * 0.75);
    over(acc, uDark, shown * (1.0 - smoothstep(0.4, 1.6, abs(gap - 1.6))) * 0.35);
  }

  // Scratches: thin broken lines at a slant.
  vec2 slant = mat2(0.82, -0.57, 0.57, 0.82) * at / scale;
  float lane = floor(slant.y / 7.0);
  float scratched = step(1.0 - uScratches * 0.12, hash(vec2(lane, 77.0)));
  float stretch = smoothstep(0.45, 0.6, noise(vec2(slant.x / 90.0, lane)));
  float thin = 1.0 - smoothstep(0.0, 0.08, abs(fract(slant.y / 7.0) - 0.5));
  over(acc, uPaper, scratched * stretch * thin * 0.7);

  // Edges browned and frayed.
  vec2 fromEdge = min(at, size - at);
  float edge = min(fromEdge.x, fromEdge.y) + (fbm(p * 5.0 + uSeed) - 0.5) * 50.0 * scale;
  float burn = (1.0 - smoothstep(0.0, 70.0 * scale, edge)) * uEdge;
  over(acc, mix(uStain, uDark, 0.45), burn * 0.85);

  gl_FragColor = acc;
}
`;

export const wornProgram: ShaderProgram = {
  name: 'worn',
  fragmentSource,
  defaultParameters: {
    wear: 0.35,
    cracks: 0.5,
    folds: 0.34,
    stains: 0.3,
    edge: 0.3,
    scratches: 0.3,
    scale: 1,
    seed: 1,
    paper: '#efe3c8',
    dark: '#2a2118',
    stain: '#8a5a2b',
  },
};
