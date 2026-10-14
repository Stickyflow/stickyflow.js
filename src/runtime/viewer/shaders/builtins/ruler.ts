import type { ShaderProgram } from '../types';

// A straight scale with a wire beside it. The wire bends around the knob and glows there; the ticks give way with it.
// The knob itself is a Shape of the document, placed on the wire by the viewer.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uIntensity;
uniform float uProgress;
uniform float uTicks;
uniform float uMajor;
uniform float uLength;
uniform float uThickness;
uniform float uRound;
uniform float uDent;
uniform float uSpread;
uniform float uInset;
uniform float uLine;
uniform float uAxis;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uGlow;
varying vec2 vUv;

void main() {
  vec2 px = vUv * uResolution;
  float horizontal = step(0.5, uAxis);
  // Along the scale from its start, and across it from the side the ticks are on.
  float along = mix(px.y, px.x, horizontal);
  float across = mix(px.x, uResolution.y - px.y, horizontal);
  float extent = mix(uResolution.y, uResolution.x, horizontal);
  float width = mix(uResolution.x, uResolution.y, horizontal);

  float inset = uInset > 0.0 ? uInset : 0.05;
  float lineAt = (uLine > 0.0 ? uLine : 0.7) * width;
  float count = max(uTicks > 0.0 ? uTicks : 50.0, 2.0);
  float every = max(uMajor > 0.0 ? uMajor : 5.0, 1.0);
  float unit = (uThickness > 0.0 ? uThickness : 0.012) * width;
  float halfLine = max(unit * 0.5, 0.75);
  float spread = (uSpread > 0.0 ? uSpread : 0.07) * extent;
  float depth = (uDent < 0.0 ? 1.0 : uDent) * 0.16 * width;

  float start = inset * extent;
  float span = (1.0 - 2.0 * inset) * extent;
  float knob = start + span * clamp(uProgress, 0.0, 1.0);

  float away = (along - knob) / spread;
  float bump = exp(-away * away);
  float wire = lineAt - depth * bump;
  float lineDistance = abs(across - wire);
  float line = 1.0 - smoothstep(halfLine - 0.75, halfLine + 0.75, lineDistance);
  vec3 lineColor = mix(uColor, uAccent, bump);

  vec3 glowColor = dot(uGlow, uGlow) > 0.0 ? uGlow : uAccent;
  float glowSide = across < wire ? 1.0 : 0.35;
  float glow = bump * exp(-lineDistance / (0.1 * width)) * glowSide * 1.3 * max(uIntensity, 0.0);

  float spacing = span / count;
  float position = (along - start) / spacing;
  float index = floor(position + 0.5);
  float inRange = step(0.0, index) * step(index, count);
  float tickAlong = abs(position - index) * spacing;
  float major = 1.0 - step(0.5, mod(index, every));
  float tickLength = (uLength > 0.0 ? uLength : 0.1) * width * mix(1.0, 1.9, major);
  float tickDistance = (start + index * spacing - knob) / spread;
  float tickBump = exp(-tickDistance * tickDistance);
  float tickEnd = lineAt - 0.12 * width - depth * 0.4 * tickBump;
  float halfTick = halfLine * mix(0.75, 1.2, major);
  float corner = halfTick * clamp(uRound, 0.0, 1.0);
  vec2 q = abs(vec2(across - (tickEnd - tickLength * 0.5), tickAlong)) - vec2(tickLength * 0.5, halfTick) + corner;
  float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - corner;
  float tick = (1.0 - smoothstep(-0.75, 0.75, edge)) * inRange * mix(0.45, 1.0, tickBump);
  vec3 tickColor = mix(uColor, uAccent, tickBump * 0.5);

  float alpha = clamp(tick + line * 0.95 + glow, 0.0, 1.0);
  vec3 rgb = tickColor * tick + lineColor * line * 0.95 + glowColor * glow;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), alpha);
}
`;

export const rulerProgram: ShaderProgram = {
  name: 'ruler',
  fragmentSource,
  replacesBaseFill: true,
};
