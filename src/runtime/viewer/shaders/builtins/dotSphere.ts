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
uniform float uShade;
uniform float uRim;
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

vec2 turn(vec2 point, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * point.x - s * point.y, s * point.x + c * point.y);
}

// How far the grid of dots is stretched at a distance r from the middle. On a ball the dots follow the surface, so the grid
// is read along the arc and not along the straight line, and the dots lean against each other toward the rim.
float stretch(float r, float sphere) {
  float rr = clamp(r, 0.0001, 0.9999);
  return mix(1.0, asin(rr) / rr, sphere);
}

// The colors across the ball: a light side, the base, a cool side and a hot patch, all turned together by uAngle.
vec3 field(vec2 q, float angle) {
  vec2 p = turn(q, -angle);
  vec3 color = uColorB;
  color = mix(color, uColorA, smoothstep(-0.05, 0.95, dot(p, normalize(vec2(-0.55, 0.65)))) * 0.95);
  vec2 side = normalize(vec2(0.62, -0.38));
  float across = dot(p, side) - 0.3 * dot(p, vec2(-side.y, side.x));
  color = mix(color, uColorC, smoothstep(0.1, 0.9, dot(p, side)) * 0.92);
  color = mix(color, uColorD, smoothstep(0.55, 1.05, across) * 0.95);
  return color;
}

void main() {
  float side = min(uResolution.x, uResolution.y);
  vec2 q = (vUv * uResolution - uResolution * 0.5) / (side * 0.5);
  float r = length(q);
  float edge = 1.0 - smoothstep(0.985, 1.0, r);
  if (edge <= 0.0) discard;

  float t = uTime * max(uSpeed, 0.0);
  float angle = radians(uAngle) + t * 0.6;
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

  vec3 color = field(qc, angle);

  // Each dot has a slope of its own: lit on the side of the light, and darker and redder where it leans out toward the rim.
  vec2 e = q - qc;
  vec2 outward = gl > 0.0001 ? normalize(qc) : vec2(0.0, 1.0);
  float depth = mix(1.0, sqrt(max(0.02, 1.0 - rc * rc)), clamp(uSphere, 0.0, 1.0));
  float reach = max(0.02, radius / cells * depth);
  float along = clamp(0.5 + 0.5 * dot(e, outward) / reach, 0.0, 1.0);
  vec2 light = turn(normalize(vec2(-0.55, 0.65)), angle);
  float slope = dot(e, light) / max(0.02, radius / cells);
  color *= 1.0 + uShade * clamp(slope, -1.0, 1.0);

  float limb = smoothstep(0.45, 1.0, rc) * clamp(uSphere, 0.0, 1.0);
  color = mix(color, uRimColor, smoothstep(0.0, 0.9, limb * (0.35 + along)) * clamp(uRim, 0.0, 1.0));
  color *= 1.0 - 0.7 * limb * smoothstep(0.55, 1.0, along) * clamp(uRim, 0.0, 1.0);

  color = mix(uBaseColor, color, inside);
  color *= max(uIntensity, 0.0);
  color += (hash(gl_FragCoord.xy + t) - 0.5) * max(uGrain, 0.0);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), edge);
}
`;

export const dotSphereProgram: ShaderProgram = {
  name: 'dotSphere',
  fragmentSource,
  defaultParameters: {
    speed: 0,
    intensity: 1,
    dots: 7,
    dotSize: 0.53,
    stagger: 1,
    sphere: 1,
    angle: 0,
    shade: 0.18,
    rim: 0.7,
    grain: 0.035,
    baseColor: '#0d0d0d',
    colorA: '#f4b49c',
    colorB: '#4a9c93',
    colorC: '#34559c',
    colorD: '#ec3f93',
    rimColor: '#e8391f',
  },
};
