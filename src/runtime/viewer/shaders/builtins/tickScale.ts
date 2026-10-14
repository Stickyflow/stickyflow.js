import type { ShaderProgram } from '../types';

// A ring of tick marks along a gauge arc. Ticks up to the progress take the accent color.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uIntensity;
uniform float uProgress;
uniform float uTicks;
uniform float uMajor;
uniform float uStart;
uniform float uSweep;
uniform float uRadius;
uniform float uLength;
uniform float uThickness;
uniform float uRound;
uniform vec3 uColor;
uniform vec3 uAccent;
varying vec2 vUv;

const float TAU = 6.28318530718;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float radius = length(p);
  float angle = atan(p.y, p.x);
  // One pixel in the units of p, so every edge is softened by exactly that much.
  float pixel = 2.0 / max(uResolution.y, 1.0);

  float sweep = radians(uSweep > 0.0 ? uSweep : 270.0);
  float start = radians(uStart != 0.0 ? uStart : 225.0);
  // The arc is shifted so the ends sit inside the range and the first and last tick are never cut by the wrap-around.
  float gap = TAU - sweep;
  float fraction = (mod(start - angle + gap * 0.5, TAU) - gap * 0.5) / sweep;

  float count = max(uTicks, 2.0);
  float inArc = step(-0.25 / count, fraction) * step(fraction, 1.0 + 0.25 / count);
  float phase = fraction * count;
  float index = floor(phase + 0.5);
  float arcDistance = abs(fract(phase + 0.5) - 0.5) / count * sweep * radius;
  float every = max(uMajor, 1.0);
  float major = 1.0 - step(0.5, mod(index, every));

  float outer = uRadius > 0.0 ? uRadius : 0.9;
  float tickLength = (uLength > 0.0 ? uLength : 0.05) * mix(1.0, 1.8, major);
  float halfWidth = max((uThickness > 0.0 ? uThickness : 0.003) * mix(1.0, 1.4, major), pixel * 0.9);
  float halfLength = tickLength * 0.5;
  // A rounded box around the tick: uRound 0 keeps the corners square, 1 turns the tick into a capsule.
  float corner = min(halfWidth, halfLength) * clamp(uRound, 0.0, 1.0);
  vec2 q = vec2(arcDistance, abs(radius - (outer - halfLength))) - vec2(halfWidth, halfLength) + corner;
  float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  float tick = (1.0 - smoothstep(-pixel, pixel, edge)) * inArc;

  float progress = uProgress < 0.0 ? 1.0 : clamp(uProgress, 0.0, 1.0);
  // Per tick, so a tick never flickers while the value rests on it.
  float lit = clamp(progress * count - index + 1.0, 0.0, 1.0);
  vec3 base = uColor;
  vec3 color = mix(base, uAccent, lit);
  float alpha = tick * mix(0.32, 1.0, lit) * max(uIntensity, 0.0);
  gl_FragColor = vec4(color * alpha, clamp(alpha, 0.0, 1.0));
}
`;

export const tickScaleProgram: ShaderProgram = {
  name: 'tickScale',
  fragmentSource,
  replacesBaseFill: true,
};
