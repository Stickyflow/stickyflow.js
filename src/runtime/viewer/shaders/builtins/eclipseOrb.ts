import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uGlow;
uniform float uDay;
uniform vec3 uTopColor;
uniform vec3 uMiddleColor;
uniform vec3 uBottomColor;
uniform vec3 uRimColor;
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  float time = uTime * max(uSpeed, 0.0);
  float glow = max(uGlow, 0.0);
  float intensity = max(uIntensity, 0.0);

  float current = sin(p.x * 4.2 - time * 0.75) * 0.025;
  current += sin(p.y * 5.0 + p.x * 2.3 + time * 0.55) * 0.018;
  float vertical = p.y + current;
  float useDay = step(0.0, uDay);
  float day = clamp(uDay, 0.0, 1.0);
  float capStart = mix(-0.04, -0.62 + day * 0.98, useDay);
  float tone = mix(1.0, mix(0.2, 1.2, day), useDay);
  vec3 bodyColor = mix(uBottomColor, uMiddleColor, smoothstep(-0.69, -0.06, vertical)) * tone;
  bodyColor = mix(bodyColor, uTopColor, smoothstep(capStart, capStart + 0.42, vertical));

  float side = smoothstep(0.35, 0.9, abs(p.x) / max(radius, 0.001));
  float lower = 1.0 - smoothstep(-0.35, 0.38, p.y);
  float ring = exp(-pow((radius - 0.765) / 0.03, 2.0));
  float rimLight = ring * (0.28 + side * 0.55 + lower * 0.52) * mix(1.0, 0.35 + 0.65 * day, useDay);
  float crest = ring * smoothstep(0.3, 0.68, p.y) * mix(1.0, 0.15 + 0.85 * day, useDay);
  bodyColor = mix(bodyColor, uRimColor, clamp(rimLight * 0.78 * intensity, 0.0, 1.0));
  bodyColor = mix(bodyColor, vec3(1.0, 0.94, 0.86), clamp(crest * 0.84 * intensity, 0.0, 1.0));

  float bodyAlpha = 1.0 - smoothstep(0.758, 0.778, radius);
  float halo = exp(-pow(max(radius - 0.765, 0.0) / 0.12, 2.0));
  halo *= (0.14 + rimLight * 0.28 + crest * 0.2) * glow * intensity;
  float crownGlow = exp(-pow(p.x / 0.48, 2.0) - pow((p.y - 0.83) / 0.16, 2.0));
  halo += crownGlow * 0.16 * glow * intensity;
  float outsideAlpha = clamp(halo, 0.0, 0.85) * (1.0 - smoothstep(0.84, 1.0, radius));
  vec3 haloColor = mix(uRimColor, vec3(1.0, 0.91, 0.77), crest * 0.55 + crownGlow * 0.45);
  float alpha = bodyAlpha + (1.0 - bodyAlpha) * outsideAlpha;
  vec3 premultipliedColor = bodyColor * bodyAlpha;
  premultipliedColor += haloColor * (1.0 - bodyAlpha) * outsideAlpha;

  gl_FragColor = vec4(premultipliedColor, alpha);
}
`;

export const eclipseOrbProgram: ShaderProgram = {
  name: 'eclipseOrb',
  fragmentSource,
};
