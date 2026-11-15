import type { ShaderProgram } from '../types';

// A map of a city made up as it is drawn, as a map draws a city: thin lines on a calm ground. Every quarter has streets of its
// own, laid in a grid of its own turn and size, some straight and some winding;
// main roads run between the quarters with roundabouts where three of them meet, highways sweep across with ramps that leave
// and join them, a river runs where it is
// told to, and points of interest glow. Every line keeps its width, and each kind of line can be left out.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uPixelScale;
uniform float uTime;
uniform float uScale;
uniform float uStreets;
uniform float uMains;
uniform float uVariety;
uniform float uRoundabouts;
uniform float uHighways;
uniform float uRamps;
uniform float uWater;
uniform float uWaterAngle;
uniform float uWaterOffset;
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

// A line drawn with its width inside w and a soft edge.
float stroke(float gap, float w, float aa) {
  return 1.0 - smoothstep(w, w + aa, gap);
}

// Where a point of the map lies among the quarters: the borders between them bend, and with variety the land is drawn
// together in places and apart in others, so some quarters are small and some large.
vec2 among(vec2 p) {
  vec2 small = vec2(noise(p * 0.55 + 4.0), noise(p * 0.55 + 23.0)) - 0.5;
  vec2 large = vec2(noise(p * 0.17 + 41.0), noise(p * 0.17 + 67.0)) - 0.5;
  return (p + small * 1.1 + large * 3.2 * clamp(uVariety, 0.0, 1.0)) / 1.9;
}

// The quarter a point lies in, its true distance to the border of that quarter, and the junction nearest to it, where the
// borders of three quarters meet: the way to it and a number of its own.
float borderOf(vec2 w, out vec2 id, out vec2 across, out vec2 toJunction, out float junction) {
  vec2 i = floor(w);
  vec2 f = fract(w);
  vec2 nearCell = vec2(0.0);
  vec2 r1 = vec2(0.0);
  vec2 r2 = vec2(0.0);
  vec2 r3 = vec2(0.0);
  vec2 c2 = vec2(0.0);
  vec2 c3 = vec2(0.0);
  float d1 = 8.0;
  float d2 = 8.0;
  float d3 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 r = g + hash2(i + g) * 0.8 + 0.1 - f;
      float d = dot(r, r);
      if (d < d1) {
        d3 = d2; r3 = r2; c3 = c2;
        d2 = d1; r2 = r1; c2 = nearCell;
        d1 = d; r1 = r; nearCell = g;
      } else if (d < d2) {
        d3 = d2; r3 = r2; c3 = c2;
        d2 = d; r2 = r; c2 = g;
      } else if (d < d3) {
        d3 = d; r3 = r; c3 = g;
      }
    }
  }
  float edge = 8.0;
  across = vec2(1.0, 0.0);
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 g = nearCell + vec2(float(x), float(y));
      vec2 r = g + hash2(i + g) * 0.8 + 0.1 - f;
      vec2 between = r - r1;
      if (dot(between, between) > 0.00001) {
        vec2 n = normalize(between);
        float gap = dot(0.5 * (r1 + r), n);
        if (gap < edge) {
          edge = gap;
          across = n;
        }
      }
    }
  }
  id = i + nearCell;
  // The junction is the point as far from all three.
  float det = 2.0 * (r1.x * (r2.y - r3.y) + r2.x * (r3.y - r1.y) + r3.x * (r1.y - r2.y));
  vec2 centre = vec2(
    dot(r1, r1) * (r2.y - r3.y) + dot(r2, r2) * (r3.y - r1.y) + dot(r3, r3) * (r1.y - r2.y),
    dot(r1, r1) * (r3.x - r2.x) + dot(r2, r2) * (r1.x - r3.x) + dot(r3, r3) * (r2.x - r1.x)
  ) / (abs(det) < 0.0001 ? 0.0001 : det);
  toJunction = centre;
  junction = hash(i * 3.0 + nearCell + c2 + c3 + 70.0);
  return edge;
}

float highwayField(vec2 p, float k) {
  return noise(p * 0.07 + vec2(k * 17.0, uSeed)) + 0.25 * noise(p * 0.21 + k * 5.0);
}

// How far a point is from the middle line of the river, across it: the river runs straight in its direction and winds a little.
float riverField(vec2 p, vec2 middle, vec2 acrossDir) {
  vec2 from = p - middle;
  float along = dot(from, vec2(-acrossDir.y, acrossDir.x));
  return dot(from, acrossDir) + (noise(vec2(along * 0.3, 2.5)) - 0.5) * 1.4;
}

void main() {
  float pixel = max(uPixelScale, 0.0001);
  // The size of the surface in whole units, so a pixel more or less of the canvas does not move the map.
  vec2 extent = floor(uResolution / pixel + 0.5);
  vec2 at = vUv * extent;
  at.y = extent.y - at.y;
  float scale = max(uScale, 0.2);
  float unit = 60.0 * scale;
  vec2 p = at / unit;
  // One pixel of the screen, in the units of the map. A line has a width on the map and is never thinner than the screen
  // can show, so it stays a hairline from afar and grows as the map is looked at closely.
  float px = 1.0 / (pixel * unit);
  float aa = px * 1.2;
  float e = 0.012;
  float streetWidth = max(0.006, px * 0.45);
  float collectorWidth = max(0.009, px * 0.6);
  float mainWidth = max(0.016, px * 0.75);
  float highwayWidth = max(0.03, px * 1.5);
  float rampWidth = max(0.01, px * 0.6);
  float railWidth = max(0.004, px * 0.4);

  vec3 color = uLand;

  // The river: a band of one width across the map, turned and moved as it is told.
  float waterTurn = radians(uWaterAngle);
  vec2 acrossDir = vec2(cos(waterTurn), sin(waterTurn));
  vec2 middle = extent / unit * 0.5 + acrossDir * uWaterOffset * 0.5 * min(extent.x, extent.y) / unit;
  float toRiver = abs(riverField(p, middle, acrossDir));
  float riverWidth = 0.05 + 0.2 * clamp(uWater, 0.0, 1.0);
  float hasWater = step(0.02, uWater);
  float water = stroke(toRiver, riverWidth, aa) * hasWater;
  // A bridge reaches a little onto the land at both ends.
  float spanned = stroke(toRiver, riverWidth + 0.035, aa) * hasWater;

  // The quarters. The distance to their border is taken back from the bent land to the map exactly, along the direction
  // across the border, so a main road has one width everywhere and no kinks.
  vec2 id;
  vec2 across;
  vec2 toJunction;
  float junction;
  vec2 here = among(p);
  vec2 alongX = (among(p + vec2(e, 0.0)) - here) / e;
  vec2 alongY = (among(p + vec2(0.0, e)) - here) / e;
  float b = borderOf(here, id, across, toJunction, junction);
  float border = b / max(length(vec2(dot(alongX, across), dot(alongY, across))), 0.05);

  // Each quarter has streets of its own turn, size and shape.
  float variety = clamp(uVariety, 0.0, 1.0);
  float turn = radians(uAngle + (hash(id + 1.0) - 0.5) * 70.0);
  mat2 rotate = mat2(cos(turn), -sin(turn), sin(turn), cos(turn));
  float size = mix(0.17 - 0.08 * variety, 0.22 + 0.2 * variety, hash(id + 2.0));
  float winding = step(0.7, hash(id + 3.0));
  vec2 bent = p + winding * 0.16 * vec2(noise(p * 1.1 + id), noise(p * 1.1 + id + 9.0));
  vec2 local = rotate * bent / size;
  float built = step(hash(id + 4.0), 0.25 + 0.75 * clamp(uStreets, 0.0, 1.0)) * step(0.01, uStreets);
  // Long blocks: some lines one way are left out.
  float keep = step(hash(vec2(floor(local.y + 0.5), id.x * 7.0 + id.y)), 0.72);
  float streets = max(stroke(toLine(local.x) * size, streetWidth, aa), stroke(toLine(local.y) * size, streetWidth, aa) * keep);
  // Every few streets one is a little wider and carries more.
  float collector = max(stroke(toLine(local.x / 4.0) * size * 4.0, collectorWidth, aa), stroke(toLine(local.y / 5.0 + 0.3) * size * 5.0, collectorWidth, aa));
  // The streets end before the border of their quarter, where the main road takes over.
  float inside = built * smoothstep(mainWidth * 2.5, mainWidth * 6.0, border);
  color = mix(color, uStreet, streets * inside * 0.8);
  vec3 wider = mix(uStreet, uArterial, 0.55);
  color = mix(color, wider, collector * inside);

  // Main roads along the borders of the quarters.
  float mains = clamp(uMains, 0.0, 1.0);
  float arterial = stroke(border, mainWidth, aa) * mains;

  // Where three main roads meet there may be a roundabout: a ring, and open ground inside it.
  // The way to the junction is taken back from the bent land to the map, so the ring is round.
  float fold = alongX.x * alongY.y - alongX.y * alongY.x;
  vec2 onMap = vec2(alongY.y * toJunction.x - alongY.x * toJunction.y, alongX.x * toJunction.y - alongX.y * toJunction.x) / (abs(fold) < 0.02 ? 0.02 : fold);
  float around = length(onMap);
  float ringSize = max(0.075, px * 6.0);
  float circled = step(junction, clamp(uRoundabouts, 0.0, 1.0)) * mains;
  float open = circled * (1.0 - smoothstep(ringSize - aa, ringSize, around));
  arterial *= 1.0 - open;
  color = mix(color, uArterial, arterial);
  color = mix(color, uLand, open);
  color = mix(color, uArterial, circled * stroke(abs(around - ringSize), mainWidth, aa));

  // Highways: long sweeping lines with a soft glow, and ramps that leave them, run beside them and join them again.
  float count = floor(clamp(uHighways, 0.0, 1.0) * 3.0 + 0.5);
  float highway = 0.0;
  float highwayRail = 0.0;
  float ramp = 0.0;
  float glow = 0.0;
  for (int k = 0; k < 3; k++) {
    if (float(k) >= count) break;
    float fk = float(k);
    float field = highwayField(p, fk);
    float steep = length(vec2(highwayField(p + vec2(e, 0.0), fk) - field, highwayField(p + vec2(0.0, e), fk) - field)) / e;
    float slope = max(steep, 0.02);
    // Where the land of the field is flat its line would spread out, so the road ends there.
    float sure = smoothstep(0.025, 0.05, steep);
    float side = (field - 0.62) / slope;
    highway = max(highway, stroke(abs(side), highwayWidth, aa) * sure);
    highwayRail = max(highwayRail, stroke(abs(abs(side) - highwayWidth * 2.1), railWidth, aa) * sure);
    glow = max(glow, exp(-abs(side) / (highwayWidth * 4.0)) * sure);
    float leave = smoothstep(1.0 - clamp(uRamps, 0.0, 1.0) * 0.55, 1.15 - clamp(uRamps, 0.0, 1.0) * 0.55, noise(p * 0.75 + fk * 31.0 + 13.0));
    float way = step(0.5, noise(p * 0.2 + fk * 7.0)) * 2.0 - 1.0;
    float apart = max(0.1, px * 7.0) * leave;
    ramp = max(ramp, stroke(abs(side - way * apart), rampWidth, aa) * step(highwayWidth + rampWidth * 2.0, apart) * sure);
  }
  color = mix(color, uHighway, glow * 0.18);
  color = mix(color, mix(uArterial, uHighway, 0.6), ramp);
  color = mix(color, uHighway, highway);

  // The river covers the small streets, which end at its shore.
  color = mix(color, uWaterColor, water);
  float shore = stroke(abs(toRiver - riverWidth), max(0.006, px * 0.8), aa) * hasWater;
  color = mix(color, mix(uWaterColor, uArterial, 0.5), shore * 0.5);

  // Main roads and highways cross it on bridges: a wider deck between two rails, with a shadow on the water beside it.
  vec3 deckColor = mix(uArterial, uHighway, 0.35);
  float mainShadow = stroke(border, mainWidth * 5.0, mainWidth * 3.0) * mains * water;
  color = mix(color, uLand, mainShadow * 0.45);
  color = mix(color, deckColor, stroke(border, mainWidth * 1.7, aa) * mains * spanned);
  color = mix(color, uHighway, stroke(abs(border - mainWidth * 3.0), railWidth, aa) * mains * spanned * 0.8);
  color = mix(color, uHighway, highway * spanned);
  color = mix(color, uHighway, highwayRail * spanned * 0.8);

  // Points of interest, each breathing at its own pace.
  vec2 spotCell = floor(p / 1.6);
  vec2 centre = (spotCell + 0.2 + hash2(spotCell + 30.0) * 0.6) * 1.6;
  float shown = step(hash(spotCell + 31.0), clamp(uPoints, 0.0, 1.0) * 0.45) * (1.0 - water);
  float breath = 0.75 + 0.25 * sin(uTime * uSpeed * 6.0 + hash(spotCell + 32.0) * 6.28);
  float away = length(p - centre);
  float dotSize = max(0.03, px * 2.6);
  color = mix(color, uPoint, shown * stroke(away, dotSize * breath, aa));
  color = mix(color, uPoint, shown * exp(-away / (dotSize * 2.7)) * 0.35 * breath);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const cityMapProgram: ShaderProgram = {
  name: 'cityMap',
  fragmentSource,
  defaultParameters: {
    scale: 1,
    streets: 0.8,
    mains: 1,
    variety: 0.5,
    roundabouts: 0.4,
    highways: 0.67,
    ramps: 0.5,
    water: 0.4,
    waterAngle: 60,
    waterOffset: 0.3,
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
