import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDotCount;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uGlow;
uniform float uMotion;
uniform vec3 uWarmColor;
uniform vec3 uLightColor;
uniform vec3 uCoolColor;
varying vec2 vUv;

mat2 rotate(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  float speed = max(uSpeed, 0.0);
  float motion = max(uMotion, 0.0);
  float time = uTime * speed;
  float rotation = time * 0.08 * motion;
  vec2 gridPosition = rotate(rotation) * p;
  float cells = max(uDotCount, 8.0);
  vec2 grid = (gridPosition + 1.0) * cells * 0.5;
  vec2 cell = fract(grid) - 0.5;
  vec2 samplePoint = (floor(grid) + 0.5) * 2.0 / cells - 1.0;
  samplePoint = rotate(-rotation) * samplePoint;

  float angle = atan(samplePoint.y, samplePoint.x);
  float radius = length(samplePoint);
  float travelingWave = sin(angle * 3.0 - time * 0.72) * 0.024 * motion;
  travelingWave += sin(angle * 7.0 + time * 0.31) * 0.009 * motion;
  float ringRadius = clamp(uRingRadius, 0.2, 0.92) + travelingWave;
  float ringWidth = max(uRingWidth, 0.025);
  float ring = bell(radius - ringRadius, ringWidth);

  float lowerBloom = bell(samplePoint.x + 0.08, 0.72) * bell(samplePoint.y + 0.56, 0.42);
  float upperArc = bell(radius - ringRadius + 0.025, ringWidth * 0.7) * smoothstep(-0.18, 0.72, samplePoint.y);
  float light = clamp(ring * (0.58 + lowerBloom * 0.64 + upperArc * 0.25), 0.0, 1.0);
  float shimmer = 0.9 + 0.1 * sin(angle * 9.0 + time * 0.48);
  float dotRadius = mix(0.055, 0.43, pow(light, 0.72) * shimmer);
  float dotDistance = length(cell);
  float dot = 1.0 - smoothstep(dotRadius - 0.045, dotRadius + 0.045, dotDistance);

  float warmWeight = smoothstep(-0.22, 0.72, samplePoint.y);
  warmWeight *= 0.76 + 0.24 * (1.0 - smoothstep(-0.45, 0.72, samplePoint.x));
  float coolWeight = smoothstep(-0.85, 0.42, samplePoint.x);
  coolWeight *= 1.0 - smoothstep(-0.78, 0.3, samplePoint.y);
  vec3 color = mix(uLightColor, uWarmColor, clamp(warmWeight, 0.0, 1.0));
  color = mix(color, uCoolColor, clamp(coolWeight * 0.72, 0.0, 0.82));
  color = mix(color, uLightColor, lowerBloom * ring * 0.58);

  float circleMask = 1.0 - smoothstep(0.965, 1.0, length(p));
  float dotAlpha = dot * pow(light, 0.82) * circleMask;
  float glow = bell(length(p) - ringRadius, ringWidth * 1.75) * max(uGlow, 0.0) * 0.17;
  glow *= circleMask;
  float alpha = clamp((dotAlpha + glow) * max(uIntensity, 0.0), 0.0, 1.0);
  vec3 glowColor = mix(uWarmColor, uCoolColor, 1.0 - smoothstep(-0.75, 0.55, samplePoint.y));
  vec3 finalColor = color * dotAlpha + glowColor * glow;

  gl_FragColor = vec4(clamp(finalColor * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const halftoneHaloProgram: ShaderProgram = {
  name: 'halftoneHalo',
  fragmentSource,
};
