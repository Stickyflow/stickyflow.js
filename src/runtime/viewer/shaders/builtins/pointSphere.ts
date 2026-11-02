import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDensity;
uniform float uDotSize;
uniform float uRipple;
uniform float uSpread;
uniform float uCore;
uniform float uLevel;
uniform float uBass;
uniform float uTreble;
uniform vec3 uColor;
uniform vec3 uHighlight;
varying vec2 vUv;

const float TAU = 6.2831853;

// One fold of a fluid sphere: its edge waves, and the rows of dots run along that edge, so they bend with it.
// x is the dots, y the same light without them.
vec2 sheet(vec2 p, float time, float seed, float size) {
  vec2 q = p - vec2(cos(time * 0.4 + seed), sin(time * 0.5 + seed * 1.7)) * uSpread;
  float radius = length(q);
  float angle = atan(q.y, q.x);
  // The bass swells the slow waves, and the treble runs fine ones along the edge.
  float swell = 1.0 + uBass * 0.9;
  float wave = sin(angle * 2.0 + time + seed) * 0.065 * swell
    + sin(angle * 3.0 - time * 1.3 + seed * 2.3) * 0.04 * swell
    + sin(angle * 5.0 + time * 0.7 + seed * 3.1) * 0.016
    + sin(angle * 11.0 + time * 3.0 + seed) * 0.022 * uTreble
    + sin(angle * 17.0 - time * 4.0 + seed * 2.0) * 0.012 * uTreble;
  float edge = size * (1.0 + uBass * 0.05) + wave * uRipple;
  float depth = edge - radius;
  if (depth < -0.02) return vec2(0.0);

  // Light gathers at the edge and in the ridges of the folds behind it, and fades toward the middle.
  float inside = max(depth, 0.0);
  float bend = sin(angle * 3.0 + seed + time * 0.6) * 2.4 + sin(angle * 7.0 - seed - time * 0.4) * 0.6;
  float ridge = 0.5 + 0.5 * sin(inside * 17.0 + bend * uRipple);
  ridge *= ridge;
  float light = exp(-inside * 4.2) * (0.3 + 0.7 * ridge);

  // Every row has as many dots as fit its length, so they keep their distance and do not crowd toward the middle.
  float rows = inside * uDensity * 1.6;
  float row = floor(rows);
  float rowRadius = max(0.04, size - row / (uDensity * 1.6));
  float count = max(6.0, floor(rowRadius * TAU * uDensity * 1.6));
  vec2 f = vec2(fract(angle / TAU * count + row * 0.37), fract(rows)) - 0.5;
  // Dots smaller than a pixel become an even tone instead of flickering.
  float pixel = uDensity * 3.2 / max(uResolution.y, 1.0);
  float dotSize = uDotSize * (0.35 + 0.85 * min(light * 1.5, 1.0)) * (1.0 + uLevel * 0.25);
  float dots = 1.0 - smoothstep(dotSize - pixel, dotSize + pixel, length(f));
  dots = mix(dots, dotSize * dotSize * 3.14, smoothstep(0.35, 0.8, pixel));
  float fade = smoothstep(-0.02, 0.0, depth);
  return vec2(dots * light, light) * fade;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float time = uTime * uSpeed;
  float radius = length(p);
  vec2 a = sheet(p, time, 0.0, 0.76);
  vec2 b = sheet(p, time * 0.8, 2.1, 0.71);
  vec2 c = sheet(p, -time * 0.65, 4.3, 0.64);
  vec2 d = sheet(p, time * 0.5, 5.7, 0.55);
  float dots = a.x + b.x * 0.9 + c.x * 0.75 + d.x * 0.6;
  float haze = a.y + b.y * 0.7 + c.y * 0.5 + d.y * 0.35;

  // Rounded like a ball: the rim catches the bright color, and the middle stays deep.
  float z = sqrt(max(0.0, 1.0 - min(radius, 1.0) * min(radius, 1.0)));
  float rim = 1.0 - z;
  float core = exp(-pow(radius / 0.45, 2.0)) * uCore * (1.0 + uBass);
  float gain = 1.0 + uLevel * 0.3;
  vec3 color = uColor * (dots * 1.6 + haze * 0.16 + core * 0.3) * gain;
  color += uHighlight * pow(clamp(dots, 0.0, 1.0), 1.5) * (0.3 + rim * 0.7) * gain;
  color += vec3(1.0) * pow(clamp(dots, 0.0, 1.0), 4.0) * uTreble * 0.3;
  color *= uIntensity;
  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0);
  alpha *= 1.0 - smoothstep(0.97, 1.0, radius);
  gl_FragColor = vec4(min(color, vec3(alpha)), alpha);
}
`;

export const pointSphereProgram: ShaderProgram = {
  name: 'pointSphere',
  fragmentSource,
  defaultParameters: {
    speed: 0.35,
    intensity: 1.2,
    density: 62,
    dotSize: 0.36,
    ripple: 1,
    spread: 0.04,
    core: 0.25,
    level: 0,
    bass: 0,
    treble: 0,
    color: '#2472ff',
    highlight: '#9fe8ff',
  },
};
