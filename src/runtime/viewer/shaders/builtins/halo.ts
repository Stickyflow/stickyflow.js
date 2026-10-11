import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uIntensity;
uniform float uSpeed;
uniform float uThickness;
uniform float uProgress;
uniform float uBoost;
varying vec2 vUv;

const float TWO_PI = 6.28318530718;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius > 1.0) discard;

  float angle = atan(p.y, p.x);
  float time = uTime * max(uSpeed, 0.0);
  float controlled = step(0.0, uProgress);
  float progress = clamp(uProgress, 0.0, 1.0);
  float boost = clamp(uBoost, 0.0, 1.0);
  float width = max(uThickness, 0.015);
  float wave = sin(angle * 2.0 - time * (1.8 + boost * 2.4)) * 0.5 + 0.5;
  float fineWave = sin(angle * 7.0 + time * 1.15) * 0.5 + 0.5;
  float ringRadius = 0.72 + sin(angle * 3.0 - time * (1.0 + boost * 1.8)) * (0.025 + boost * 0.012);
  float ring = exp(-pow((radius - ringRadius) / width, 2.0));
  float outerRim = exp(-pow((radius - 0.94) / 0.025, 2.0));

  float startAngle = -2.35;
  float sweep = 4.70;
  float arcPosition = mod(startAngle - angle + TWO_PI, TWO_PI);
  float arcHead = progress * sweep;
  float idleTravel = sin(time * 0.82) * 0.025 * (1.0 - boost);
  float displayedHead = clamp(arcHead + idleTravel, 0.0, sweep);
  float arcEdge = 0.025;
  float arcMask = (1.0 - smoothstep(displayedHead - arcEdge, displayedHead + arcEdge, arcPosition));
  arcMask *= 1.0 - step(sweep, arcPosition);
  float arcActive = smoothstep(0.0, 0.012, progress);
  arcMask *= arcActive;

  float ambientHead = -2.25 + sin(time * 0.45) * 0.35;
  float progressHead = startAngle - displayedHead;
  float headAngle = mix(ambientHead, progressHead, controlled);
  float angleFromHead = atan(sin(angle - headAngle), cos(angle - headAngle));
  float flare = exp(-pow(angleFromHead / (0.18 + boost * 0.035), 2.0));
  flare *= exp(-pow((radius - 0.73) / 0.12, 2.0));
  float ambientBand = ring * (0.32 + wave * 0.38);
  float startDelta = atan(sin(angle - startAngle), cos(angle - startAngle));
  float radialDelta = radius - ringRadius;
  float startCapDistance = length(vec2(radialDelta, startDelta * ringRadius));
  float endCapDistance = length(vec2(radialDelta, angleFromHead * ringRadius));
  float roundedCaps = max(
    exp(-pow(startCapDistance / width, 2.0)),
    exp(-pow(endCapDistance / width, 2.0))
  ) * arcActive;
  float progressShape = max(ring * arcMask, roundedCaps);
  float progressBand = progressShape * (0.72 + boost * 0.55);
  float idleBand = ring * (0.16 + wave * 0.16 + fineWave * 0.06);
  float band = mix(ambientBand, idleBand + progressBand, controlled);
  float pulse = 1.0 + boost * (0.18 + sin(time * 8.0) * 0.08);
  float energy = clamp((band + outerRim * (0.24 + boost * 0.12) + flare * (1.35 + boost * 0.55) + fineWave * ring * 0.12) * uIntensity * pulse, 0.0, 1.0);
  vec3 base = uColor * (0.1 + 0.28 * (1.0 - radius));
  vec3 color = mix(base, uAccent, energy);
  color += uAccent * flare * (0.3 + boost * 0.35);
  float alpha = 1.0 - smoothstep(0.96, 1.0, radius);
  gl_FragColor = vec4(color, alpha);
}
`;

export const haloProgram: ShaderProgram = {
  name: 'halo',
  fragmentSource,
};
