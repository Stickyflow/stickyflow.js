import type { ShaderProgram } from '../types';

// A map of a city made up as it is drawn, as a map draws a city: thin lines on a calm ground. Every quarter has streets of its
// own, laid in a grid of its own turn and size, some straight and some winding; main roads run between the quarters, a few wide
// highways sweep across, a river winds through with a clear shore, and a few points of interest glow. Every line keeps its width.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uPixelScale;
uniform float uTime;
uniform float uScale;
uniform float uStreets;
uniform float uWater;
uniform float uHighways;
uniform float uPoints;
uniform float uSpeed;
uniform float uAngle;
uniform float uSeed;
uniform vec3 uLand;
uniform vec3 uStreet;
uniform vec3 uArterial;
uniform vec3 uHighway;
uniform vec3 uWaterColor;
uniform vec3 uPoint;
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

float toLine(float coord) {
  return abs(fract(coord + 0.5) - 0.5);
}

// The quarter a point lies in, and how far it is from the border to the next one.
void quarter(vec2 p, out vec2 id, out float border) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float nearest = 8.0;
  float second = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 r = g + hash2(i + g) * 0.8 + 0.1 - f;
      float d = dot(r, r);
      if (d < nearest) {
        second = nearest;
        nearest = d;
        id = i + g;
      } else if (d < second) {
        second = d;
      }
    }
  }
  border = (sqrt(second) - sqrt(nearest)) * 0.5;
}

// A line drawn with its width inside w and a soft edge.
float stroke(float gap, float w, float aa) {
  return 1.0 - smoothstep(w, w + aa, gap);
}

// The fields whose level lines are the highways and the river.
float highwayField(vec2 p, float k) {
  return noise(p * 0.07 + vec2(k * 17.0, uSeed)) + 0.25 * noise(p * 0.21 + k * 5.0);
}

float riverField(vec2 p) {
  return noise(p * 0.06 + vec2(3.0, uSeed * 0.7)) + 0.18 * noise(p * 0.19 + 11.0);
}

void main() {
  float pixel = max(uPixelScale, 0.0001);
  vec2 at = vUv * uResolution / pixel;
  at.y = uResolution.y / pixel - at.y;
  float scale = max(uScale, 0.2);
  float unit = 60.0 * scale;
  vec2 p = at / unit;
  // One pixel of the screen, in the units of the map.
  float px = 1.0 / (pixel * unit);
  float e = 0.01;

  vec3 color = uLand;

  // The river: a band of one width along a winding line.
  float wet = riverField(p);
  float wetSlope = max(length(vec2(riverField(p + vec2(e, 0.0)) - wet, riverField(p + vec2(0.0, e)) - wet)) / e, 0.05);
  float toRiver = abs(wet - 0.6) / wetSlope;
  float riverWidth = 0.05 + 0.16 * clamp(uWater, 0.0, 1.0);
  float water = stroke(toRiver, riverWidth, px) * step(0.02, uWater);

  // The quarters, each with streets of its own turn, size and shape.
  vec2 id;
  float border;
  // The borders between quarters bend, as roads that grew do.
  vec2 drift = vec2(noise(p * 0.55 + 4.0), noise(p * 0.55 + 23.0)) - 0.5;
  quarter((p + drift * 1.1) / 1.9, id, border);
  border *= 1.9;
  float turn = radians(uAngle + (hash(id + 1.0) - 0.5) * 70.0);
  mat2 rotate = mat2(cos(turn), -sin(turn), sin(turn), cos(turn));
  float size = mix(0.11, 0.3, hash(id + 2.0));
  float winding = step(0.7, hash(id + 3.0));
  vec2 bent = p + winding * 0.16 * vec2(noise(p * 1.1 + id), noise(p * 1.1 + id + 9.0));
  vec2 local = rotate * bent / size;
  float built = step(hash(id + 4.0), 0.25 + 0.75 * clamp(uStreets, 0.0, 1.0));
  // Long blocks: some lines one way are left out.
  float keep = step(hash(vec2(floor(local.y + 0.5), id.x * 7.0 + id.y)), 0.72);
  float streets = max(stroke(toLine(local.x) * size, px * 0.45, px), stroke(toLine(local.y) * size, px * 0.45, px) * keep);
  // The streets end before the border of their quarter, where the main road takes over.
  // Every few streets one is a little wider and carries more.
  float collector = max(stroke(toLine(local.x / 4.0) * size * 4.0, px * 0.6, px), stroke(toLine(local.y / 5.0 + 0.3) * size * 5.0, px * 0.6, px));
  float inside = built * smoothstep(px * 2.0, px * 6.0, border);
  color = mix(color, uStreet, streets * inside * 0.8);
  color = mix(color, mix(uStreet, uArterial, 0.55), collector * inside);

  // Main roads along the borders of the quarters.
  float arterial = stroke(border, px * 0.75, px);
  color = mix(color, uArterial, arterial);

  // Highways: a few long sweeping lines with a soft glow.
  float count = floor(clamp(uHighways, 0.0, 1.0) * 3.0 + 0.5);
  float highway = 0.0;
  float glow = 0.0;
  for (int k = 0; k < 3; k++) {
    if (float(k) >= count) break;
    float field = highwayField(p, float(k));
    float slope = max(length(vec2(highwayField(p + vec2(e, 0.0), float(k)) - field, highwayField(p + vec2(0.0, e), float(k)) - field)) / e, 0.05);
    float gap = abs(field - 0.62) / slope;
    highway = max(highway, stroke(gap, px * 1.5, px));
    glow = max(glow, exp(-gap / (px * 6.0)));
  }
  color = mix(color, uHighway, glow * 0.18);
  color = mix(color, uHighway, highway);

  // The river lies over the small streets; main roads and highways cross it on bridges.
  color = mix(color, uWaterColor, water * (1.0 - max(highway, arterial)));
  float shore = stroke(abs(toRiver - riverWidth), px * 0.5, px) * step(0.02, uWater);
  color = mix(color, uArterial, shore * 0.45 * (1.0 - highway));

  // Points of interest, each breathing at its own pace.
  vec2 spotCell = floor(p / 1.6);
  vec2 centre = (spotCell + 0.2 + hash2(spotCell + 30.0) * 0.6) * 1.6;
  float shown = step(hash(spotCell + 31.0), clamp(uPoints, 0.0, 1.0) * 0.45) * (1.0 - water);
  float breath = 0.75 + 0.25 * sin(uTime * uSpeed * 6.0 + hash(spotCell + 32.0) * 6.28);
  float away = length(p - centre);
  color = mix(color, uPoint, shown * stroke(away, px * 2.6 * breath, px));
  color = mix(color, uPoint, shown * exp(-away / (px * 7.0)) * 0.35 * breath);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const cityMapProgram: ShaderProgram = {
  name: 'cityMap',
  fragmentSource,
  defaultParameters: {
    scale: 1,
    streets: 0.8,
    water: 0.4,
    highways: 0.67,
    points: 0.5,
    speed: 0.2,
    angle: 15,
    seed: 3,
    land: '#0b0d12',
    street: '#3c4352',
    arterial: '#7a8396',
    highway: '#eef1f6',
    waterColor: '#161d2a',
    point: '#ff8a3d',
  },
};
