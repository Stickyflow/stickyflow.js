import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uBloom;
uniform float uMotion;
uniform vec3 uWarmColor;
uniform vec3 uCoolColor;
uniform vec3 uAccentColor;
uniform vec3 uHighlightColor;
varying vec2 vUv;

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

float displacedRing(vec2 point, float radius, float width, float phase, float time, float motion) {
  float angle = atan(point.y, point.x);
  float wave = sin(angle * 2.0 + phase + time * 0.4) * 0.052;
  wave += sin(angle * 3.0 - phase * 0.45 + time * 0.27) * 0.025;
  wave += sin(angle * 6.0 - phase * 0.7 - time * 0.23) * 0.011;
  return bell(length(point) - radius - wave * motion, width);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * max(uSpeed, 0.0);
  float radius = clamp(uRingRadius, 0.25, 0.88);
  float width = max(uRingWidth, 0.025);
  float motion = max(uMotion, 0.0);

  vec2 coolOffset = vec2(-0.052, -0.012) * (0.7 + motion * 0.3);
  vec2 warmOffset = vec2(0.042, 0.024) * (0.7 + motion * 0.3);
  vec2 accentOffset = vec2(0.016, -0.044) * (0.7 + motion * 0.3);
  float coolRing = displacedRing(p + coolOffset, radius, width * 1.18, 0.4, time, motion);
  float warmRing = displacedRing(p + warmOffset, radius, width * 1.05, 2.6, time, motion);
  float accentRing = displacedRing(p + accentOffset, radius, width, 4.8, time, motion);
  float coreRing = displacedRing(p, radius, width * 0.48, 1.7, time, motion);

  vec3 color = uCoolColor * coolRing * 0.72;
  color += uWarmColor * warmRing * 0.68;
  color += uAccentColor * accentRing * 0.64;
  color += uHighlightColor * coreRing * 1.35;
  float broadBloom = displacedRing(p, radius, width * 2.35, 0.0, time, motion);
  color += mix(uCoolColor, uWarmColor, smoothstep(-0.8, 0.8, p.y)) * broadBloom * max(uBloom, 0.0) * 0.2;

  float ringAlpha = max(max(coolRing, warmRing), max(accentRing, coreRing));
  float alpha = clamp(ringAlpha * 0.9 + broadBloom * max(uBloom, 0.0) * 0.18, 0.0, 1.0);
  float circleMask = 1.0 - smoothstep(0.965, 1.0, length(p));
  alpha *= circleMask * max(uIntensity, 0.0);
  color *= circleMask * max(uIntensity, 0.0);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

export const chromaticHaloProgram: ShaderProgram = {
  name: 'chromaticHalo',
  fragmentSource,
};
