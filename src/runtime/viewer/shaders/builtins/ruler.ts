import type { ShaderProgram } from '../types';

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
uniform float uGap;
uniform float uKnobRadius;
uniform float uAxis;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uGlow;
uniform vec3 uCore;
uniform vec3 uPeak;
varying vec2 vUv;

float wireAt(float at, float lineAt, float depth, float radius, float knob, float spread) {
  float reach = abs(at - knob);
  if (uKnobRadius > 0.0) {
    float outline = max(sqrt(max(radius * radius - reach * reach, 0.0)) - (radius - depth), 0.0);
    float shoulder = max(sqrt(2.0 * depth * radius) * 0.9, 1.0);
    float soft = depth * exp(-(reach * reach) / (shoulder * shoulder));
    float k = max(depth * 0.15, 1.0);
    float h = max(k - abs(outline - soft), 0.0) / k;
    return lineAt - (max(outline, soft) + h * h * k * 0.25);
  }
  float away = reach / spread;
  return lineAt - depth * exp(-away * away);
}

void main() {
  vec2 px = vUv * uResolution;
  float horizontal = step(0.5, uAxis);
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
  float radius = (uKnobRadius + (uGap > 0.0 ? uGap : 0.04)) * width;
  float wire = wireAt(along, lineAt, depth, radius, knob, spread);
  float slope = (wireAt(along + 1.0, lineAt, depth, radius, knob, spread) - wireAt(along - 1.0, lineAt, depth, radius, knob, spread)) * 0.5;
  float lineDistance = abs(across - wire) / sqrt(1.0 + slope * slope);
  float line = 1.0 - smoothstep(halfLine - 0.75, halfLine + 0.75, lineDistance);
  float wireDistance = abs(across - wire);
  vec3 lineColor = mix(uColor, uAccent, bump);

  vec3 glowColor = dot(uGlow, uGlow) > 0.0 ? uGlow : uAccent;
  float glowSide = across < wire ? 1.0 : 0.35;
  float glow = bump * exp(-wireDistance / (0.1 * width)) * glowSide * 1.3 * max(uIntensity, 0.0);
  vec3 coreColor = dot(uCore, uCore) > 0.0 ? uCore : mix(glowColor, vec3(1.0), 0.55);
  float core = bump * bump * exp(-wireDistance / (0.035 * width)) * glowSide * 1.6 * max(uIntensity, 0.0);
  float reachEdge = min(min(along, extent - along), min(across, width - across));
  float fade = smoothstep(0.0, 0.14 * width, reachEdge);
  glow *= fade;
  core *= fade;

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
  float tick = (1.0 - smoothstep(-0.75, 0.75, edge)) * inRange * mix(0.4, 1.0, tickBump);
  vec3 peakColor = dot(uPeak, uPeak) > 0.0 ? uPeak : vec3(1.0);
  vec3 tickColor = mix(uColor, peakColor, tickBump);

  float alpha = clamp(tick + line * 0.95 + glow + core, 0.0, 1.0);
  vec3 rgb = tickColor * tick + lineColor * line * 0.95 + glowColor * glow + coreColor * core;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), alpha);
}
`;

export const rulerProgram: ShaderProgram = {
  name: 'ruler',
  fragmentSource,
  replacesBaseFill: true,
};
