import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDots;
uniform float uDotSize;
uniform float uStagger;
uniform float uSphere;
uniform float uAngle;
uniform float uSpread;
uniform float uWarp;
uniform float uGlow;
uniform float uLens;
uniform float uGrain;
uniform vec3 uBaseColor;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uColorD;
uniform vec3 uRimColor;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return 0.5 * noise(p) + 0.25 * noise(p * 2.03 + 3.1) + 0.125 * noise(p * 4.01 + 7.7);
}

vec2 turn(vec2 point, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * point.x - s * point.y, s * point.x + c * point.y);
}

// How far the grid is stretched at a distance r from the middle; with sphere the dots follow the surface of a ball.
float stretch(float r, float sphere) {
  float rr = clamp(r, 0.0001, 0.9999);
  return mix(1.0, asin(rr) / rr, sphere);
}

// The color under the dots: an uneven cloud of color whose edge bleeds out into the dark, with a red glow around it.
// body is how much of the cloud is there, from 1 inside to 0 far outside.
vec3 field(vec2 q, float angle, float t, out float body) {
  vec2 p = turn(q, -angle);
  vec2 bend = vec2(fbm(p * 2.2 + vec2(t * 0.3, 1.7)), fbm(p * 2.2 + vec2(8.3, -t * 0.25))) - 0.35;
  vec2 w = p + bend * max(uWarp, 0.0) * 0.4;
  float rr = length(w) / max(uSpread, 0.2);
  body = 1.0 - smoothstep(0.78, 1.22, rr);

  vec3 c = uColorB;
  c = mix(c, uColorA, smoothstep(-0.1, 0.95, dot(w, normalize(vec2(-0.6, 0.7)))) * 0.95);
  c = mix(c, uColorC, smoothstep(-0.05, 0.6, dot(w, normalize(vec2(0.7, -0.45)))) * 0.9);
  c = mix(c, uColorD, smoothstep(0.18, 0.85, dot(w, normalize(vec2(0.85, -0.55)))) * 0.97);
  float ring = smoothstep(0.8, 1.05, rr) * max(uGlow, 0.0);
  c = mix(c, uRimColor, clamp(ring, 0.0, 1.0));
  return mix(uBaseColor, c, body);
}

void main() {
  float side = min(uResolution.x, uResolution.y);
  vec2 q = (vUv * uResolution - uResolution * 0.5) / (side * 0.5);
  float r = length(q);
  float edge = 1.0 - smoothstep(0.985, 1.0, r);
  if (edge <= 0.0) discard;

  float t = uTime * max(uSpeed, 0.0);
  float angle = radians(uAngle);
  float cells = max(uDots, 2.0) * 0.5;
  vec2 g = q * stretch(r, uSphere) * cells;

  // The dot that is nearest wins, so dots that lie close cut each other along a straight line.
  float stagger = clamp(uStagger, 0.0, 1.0);
  vec2 cell = floor(g);
  float best = 1e9;
  vec2 centre = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell + vec2(float(i), float(j));
      float shift = stagger * 0.5 * mod(c.y, 2.0);
      vec2 mid = vec2(c.x + 0.5 + shift, c.y + 0.5);
      float d = length(g - mid);
      if (d < best) {
        best = d;
        centre = mid;
      }
    }
  }

  // Where the middle of that dot lies on the screen, found by running the stretch backwards.
  vec2 gc = centre / cells;
  float gl = length(gc);
  float rc = gl;
  for (int k = 0; k < 5; k++) {
    rc = gl / stretch(rc, uSphere);
  }
  rc = clamp(rc, 0.0, 1.0);
  vec2 qc = gl > 0.0001 ? gc / gl * rc : vec2(0.0);

  float radius = clamp(uDotSize, 0.2, 0.9);
  float aa = 1.6 / side * cells * 2.0;
  float inside = 1.0 - smoothstep(radius - aa, radius + aa, best);

  float bodyHere;
  float bodyDot;
  vec3 colorHere = field(q, angle, t, bodyHere);
  field(qc, angle, t, bodyDot);

  // Between the dots the cloud is darker, so the dots read as glass lying on it.
  vec3 gap = colorHere * mix(0.3, 0.9, bodyHere);

  // Every dot is a lens with a gradient of its own: lighter on the side that faces the middle, dark on the side that faces out.
  // The darker side grows toward the edge of the cloud, until the dots there are nearly black.
  vec2 e = (g - centre) / max(radius, 0.001);
  vec2 outward = length(qc) > 0.0001 ? normalize(qc) : vec2(0.0, 1.0);
  vec2 outwardGrid = outward;
  float along = clamp(dot(e, outwardGrid), -1.0, 1.0);
  float edgeness = 1.0 - smoothstep(0.1, 0.9, bodyDot);
  float lens = clamp(uLens, 0.0, 1.5);
  float darken = lens * (0.1 + 0.9 * edgeness) * smoothstep(-0.55, 1.0, along);
  float lift = lens * 0.09 * (1.0 - edgeness) * (-along);
  vec3 glass = colorHere * (1.0 + lift) * (1.0 - clamp(darken, 0.0, 0.96));

  vec3 color = mix(gap, glass, inside);
  color *= max(uIntensity, 0.0);
  color += (hash(gl_FragCoord.xy + t) - 0.5) * max(uGrain, 0.0);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), edge);
}
`;

export const glassDotsProgram: ShaderProgram = {
  name: 'glassDots',
  fragmentSource,
  defaultParameters: {
    speed: 0,
    intensity: 1,
    dots: 13,
    dotSize: 0.5,
    stagger: 0,
    sphere: 0,
    angle: 0,
    spread: 0.86,
    warp: 1,
    glow: 0.75,
    lens: 0.75,
    grain: 0.06,
    baseColor: '#121212',
    colorA: '#f4b49c',
    colorB: '#4a9c93',
    colorC: '#34559c',
    colorD: '#ec3f93',
    rimColor: '#d93a24',
  },
};
