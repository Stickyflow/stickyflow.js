import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uOrbSize;
uniform float uBandWidth;
uniform float uBloom;
uniform float uMotion;
uniform vec3 uOrbColor;
uniform vec3 uCyanColor;
uniform vec3 uMagentaColor;
uniform vec3 uWarmColor;
varying vec2 vUv;

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

float hash21(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);

  float time = uTime * max(uSpeed, 0.0);
  float motion = max(uMotion, 0.0);
  float orbRadius = clamp(uOrbSize, 0.34, 0.78);
  vec2 center = vec2(0.0, 0.2);
  vec2 q = p - center;
  float radius = length(q);
  float inside = 1.0 - smoothstep(orbRadius - 0.012, orbRadius + 0.008, radius);
  float depth = sqrt(max(1.0 - pow(radius / orbRadius, 2.0), 0.0));

  float angle = atan(q.y, q.x);
  float wave = sin(angle * 2.0 - time * 0.58) * 0.025 * motion;
  wave += sin(angle * 5.0 + time * 0.31) * 0.009 * motion;
  float normalizedX = clamp(q.x / orbRadius, -1.0, 1.0);
  float bandY = -0.3 + 0.2 * normalizedX * normalizedX + wave;
  float width = max(uBandWidth, 0.025);
  float band = bell(q.y - bandY, width);
  band *= 1.0 - smoothstep(0.58, 1.02, abs(normalizedX));
  band *= inside;

  float cyanPhase = 0.5 + 0.5 * sin(angle - time * 0.42);
  vec3 spectral = mix(uMagentaColor, uCyanColor, cyanPhase);
  float lowerMask = smoothstep(0.12, -0.42, q.y);
  float sideRim = bell(radius - orbRadius, 0.035) * (0.34 + lowerMask * 0.66);
  float hotCore = bell(q.y - bandY - 0.012, width * 0.5) * inside;
  float lowerLight = 1.0 - smoothstep(bandY - width * 2.8, bandY + width * 0.4, q.y);
  lowerLight *= inside;

  float upperShade = smoothstep(-0.35, 0.72, q.y / orbRadius);
  vec3 sphere = uOrbColor * (0.45 + depth * 0.5 + upperShade * 0.14);
  sphere += uCyanColor * bell(q.x + orbRadius * 0.78, 0.12) * lowerMask * 0.18;
  sphere = mix(sphere, mix(uOrbColor, uMagentaColor, 0.52), lowerLight * 0.6);
  sphere += uWarmColor * hotCore * 0.72;
  sphere += spectral * band * 0.62;
  sphere += mix(uCyanColor, uMagentaColor, smoothstep(-orbRadius, orbRadius, q.x)) * sideRim * 0.72;

  float coneWidth = 0.22 + max(-q.y - 0.04, 0.0) * 0.42;
  float cone = bell(p.x + sin(time * 0.26) * 0.025 * motion, coneWidth);
  cone *= 1.0 - smoothstep(-0.88, -0.12, p.y);
  cone *= 1.0 - inside;
  float bloom = max(uBloom, 0.0);
  vec3 coneColor = mix(uMagentaColor, uOrbColor, smoothstep(-0.95, -0.18, p.y));

  vec3 color = sphere * inside;
  color += coneColor * cone * bloom * 0.58;
  color += spectral * bell(q.y - bandY, width * 2.8) * inside * bloom * 0.2;

  float grain = (hash21(gl_FragCoord.xy) - 0.5) * 0.012 * inside;
  color += grain;
  float alpha = inside * 0.98 + sideRim * 0.26 + cone * bloom * 0.36;
  float canvasFade = 1.0 - smoothstep(0.88, 1.0, max(abs(p.x), abs(p.y)));
  alpha = clamp(alpha * canvasFade * max(uIntensity, 0.0), 0.0, 1.0);
  vec3 finalColor = clamp(color * max(uIntensity, 0.0), 0.0, 1.0) * alpha;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const auroraOrbProgram: ShaderProgram = {
  name: 'auroraOrb',
  fragmentSource,
};
