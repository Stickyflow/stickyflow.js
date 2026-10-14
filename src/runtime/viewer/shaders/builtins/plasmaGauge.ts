import type { ShaderProgram } from '../types';

// A gauge orb: a perfectly round sphere that is pressed in, fluidly, where the needle points. The dent is gone at rest, the colors
// run from a cool blue at rest to a hot pink at full throttle. The tick scale around it is a separate program (tickScale).
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uProgress;
uniform float uDent;
uniform float uBoost;
uniform float uFlare;
uniform float uStart;
uniform float uSweep;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uHot;
varying vec2 vUv;

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

float wrap(float angle) {
  return atan(sin(angle), cos(angle));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * max(uSpeed, 0.0);
  float radius = length(p);
  float angle = atan(p.y, p.x);

  float sweep = radians(uSweep > 0.0 ? uSweep : 270.0);
  float start = radians(uStart != 0.0 ? uStart : 225.0);
  float progress = clamp(uProgress < 0.0 ? 0.35 : uProgress, 0.0, 1.0);
  float needleAngle = start - progress * sweep;
  float delta = wrap(angle - needleAngle);

  // The dent follows its own value (dent, usually with a Lag), so it trails the needle.
  float dentValue = clamp(uDent < 0.0 ? progress : uDent, 0.0, 1.0);
  float engage = smoothstep(0.0, 0.28, dentValue);
  float boost = smoothstep(0.0, 1.0, clamp(uBoost, 0.0, 1.0));
  float energy = smoothstep(0.0, 1.0, dentValue);
  float level = (uFlare > 0.0 ? uFlare : 1.0) * engage * (0.45 + 0.5 * energy + 0.3 * boost);

  float heat = smoothstep(0.15, 1.0, clamp(0.75 * energy + 0.5 * boost, 0.0, 1.0));
  vec3 cool = mix(uAccent, vec3(0.18, 0.28, 0.95), 0.55);
  vec3 hot = uHot;
  vec3 tint = mix(cool, hot, heat);

  // The needle (progress) is a finger moving through a fluid that follows with a delay (dent). While it speeds up it drags a groove
  // behind it and piles the fluid up in front; when it stops, the groove closes and the pile settles back at an even pace.
  float ripple = 0.5 + 0.5 * sin(delta * 9.0 - time * 1.4);
  float wake = (progress - dentValue) * sweep;
  float lo = min(0.0, wake);
  float hi = max(0.0, wake);
  float segment = delta < lo ? lo - delta : (delta > hi ? delta - hi : 0.0);
  float wakePos = hi > lo ? clamp((delta - lo) / (hi - lo), 0.0, 1.0) : 0.0;
  float fromNeedle = wake >= 0.0 ? wakePos : 1.0 - wakePos;
  float taper = mix(1.0, 0.45, fromNeedle * smoothstep(0.02, 0.2, abs(wake)));
  float dent = bell(segment, 0.13 + 0.02 * ripple) * (0.82 + 0.18 * ripple) * taper;
  float shoulder = bell(delta, 0.34);
  float ahead = wake >= 0.0 ? -1.0 : 1.0;
  float pile = bell(delta - ahead * 0.17, 0.15) * clamp(abs(wake) * 2.2, 0.0, 1.0) * engage;
  float baseRadius = 0.72;
  float orbRadius = baseRadius * (1.0 - 0.32 * level * dent - 0.07 * level * shoulder + 0.13 * pile);
  float body = 1.0 - smoothstep(orbRadius - 0.012, orbRadius + 0.012, radius);
  float depth = clamp(radius / orbRadius, 0.0, 1.25);
  float roundDepth = clamp(radius / baseRadius, 0.0, 1.2);

  // Blue everywhere at rest; with speed the gradient turns pink, first around the dent.
  float local = clamp(heat * (0.7 + 0.3 * bell(delta, 0.9)) + 0.25 * heat * bell(delta, 0.3), 0.0, 1.0);
  vec3 rim = mix(cool, hot, local);
  vec3 bodyColor = mix(uColor, rim * (0.5 + 0.25 * energy), pow(roundDepth, 2.6));
  bodyColor += mix(uAccent, hot, local) * (0.26 + 0.3 * energy) * bell(roundDepth - 0.93, 0.13);
  bodyColor *= (0.82 + 0.18 * smoothstep(-0.5, 0.5, -p.x)) * (0.9 + 0.6 * energy * energy);

  float ribbons = 0.5 + 0.5 * sin(depth * 24.0 - delta * 8.0 + time * 1.1);
  float zone = max(bell(delta, 0.3), dent * 0.8) * bell(depth - 0.84, 0.32) * level * (1.0 + 0.9 * energy);
  vec3 ribbonColor = mix(tint, hot, smoothstep(0.2, 0.9, ribbons) * (0.35 + 0.65 * heat));
  bodyColor = mix(bodyColor, ribbonColor, clamp(zone * (0.4 + 0.45 * ribbons), 0.0, 1.0));
  float edge = max(max(bell(delta, 0.2), dent * 0.7), pile * 0.8) * bell(depth - 0.99, 0.09) * level;
  bodyColor += mix(hot, vec3(1.0, 0.92, 1.0), 0.45) * edge * (0.45 + 1.3 * energy);

  float outside = max(radius - orbRadius, 0.0);
  float notchLight = max(max(bell(delta, 0.2), dent * 0.8), pile * 0.6) * level;
  float halo = exp(-outside * (12.0 - 6.0 * notchLight * (0.4 + energy))) * (1.0 - body) * (0.2 + 0.5 * energy * energy + 0.9 * notchLight * (0.5 + energy));
  vec3 haloColor = mix(tint, hot, clamp(notchLight * 1.2, 0.0, 1.0));

  float cross = abs(p.x * sin(needleAngle) - p.y * cos(needleAngle));
  float along = p.x * cos(needleAngle) + p.y * sin(needleAngle);
  float needleSpan = smoothstep(0.1, 0.2, along) * (1.0 - smoothstep(0.9, 0.96, along));
  float needle = smoothstep(0.0055, 0.0008, cross) * needleSpan;
  float needleGlow = bell(cross, 0.02) * needleSpan * (0.25 + 0.35 * energy);

  vec3 color = bodyColor * body + haloColor * halo + vec3(1.0, 0.94, 1.0) * needle + hot * needleGlow;
  float alpha = max(max(body, clamp(halo, 0.0, 1.0)), max(needle, needleGlow * 0.8));

  float fade = 1.0 - smoothstep(0.88, 0.99, radius);
  float gain = max(uIntensity, 0.0) * fade;
  gl_FragColor = vec4(clamp(color * gain, 0.0, 1.0), clamp(alpha * gain, 0.0, 1.0));
}
`;

export const plasmaGaugeProgram: ShaderProgram = {
  name: 'plasmaGauge',
  fragmentSource,
  replacesBaseFill: true,
};
