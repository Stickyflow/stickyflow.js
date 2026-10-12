import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDensity;
uniform float uParticleSize;
uniform float uRingRadius;
uniform float uRingWidth;
uniform float uDust;
uniform float uGlow;
uniform float uMotion;
uniform vec3 uCyanColor;
uniform vec3 uMagentaColor;
uniform vec3 uGoldColor;
varying vec2 vUv;

float hash21(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash22(vec2 point) {
  return fract(sin(vec2(
    dot(point, vec2(127.1, 311.7)),
    dot(point, vec2(269.5, 183.3))
  )) * 43758.5453123);
}

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

mat2 rotate(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

vec2 swarmPoint(vec2 p, float time, float direction, float motion) {
  float radius = length(p);
  float orbit = time * (0.42 + radius * 0.2) * direction * motion;
  vec2 q = rotate(orbit) * p;
  vec2 flow = vec2(
    sin(q.y * 3.4 + time * 0.86 * direction),
    cos(q.x * 3.1 - time * 0.74 * direction)
  );
  q += flow * 0.038 * motion;
  q *= 1.0 + sin(radius * 8.0 - time * 0.82) * 0.018 * motion;
  return q;
}

float particleLayer(vec2 p, float cells, float seed) {
  vec2 grid = p * cells;
  vec2 cellId = floor(grid);
  vec2 randomOffset = hash22(cellId + seed) - 0.5;
  vec2 local = fract(grid) - 0.5 - randomOffset * 0.62;
  vec2 samplePoint = (cellId + 0.5 + randomOffset * 0.62) / cells;

  float angle = atan(samplePoint.y, samplePoint.x);
  float radius = length(samplePoint);
  float ripple = sin(angle * 3.0) * 0.018;
  ripple += sin(angle * 7.0 + 0.8) * 0.007;
  float ringDistance = radius - (clamp(uRingRadius, 0.25, 0.82) + ripple);
  float ringDust = bell(ringDistance, max(uRingWidth, 0.025) * 1.35);
  float innerDust = (1.0 - smoothstep(0.12, clamp(uRingRadius, 0.25, 0.82), radius)) * 0.28;
  float plume = bell(ringDistance - 0.05, 0.25);
  plume *= smoothstep(-0.18, 0.92, samplePoint.x);
  plume *= bell(samplePoint.y - samplePoint.x * 0.16, 0.62);
  float probability = ringDust * 0.82 + (innerDust + plume * 0.64) * max(uDust, 0.0);
  float alive = step(hash21(cellId + seed * 11.3), clamp(probability, 0.0, 0.96));

  float randomSize = mix(0.1, 0.28, hash21(cellId + seed * 5.9));
  float size = randomSize * max(uParticleSize, 0.05);
  float particle = 1.0 - smoothstep(size, size + 0.09, length(local));
  return particle * alive;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float radius = length(p);
  if (radius >= 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float motion = max(uMotion, 0.0);
  float cells = max(uDensity, 28.0);
  vec2 fineSwarm = swarmPoint(p, time, 1.0, motion);
  vec2 broadSwarm = swarmPoint(p, time * 0.82, -0.68, motion);
  float fineParticles = particleLayer(fineSwarm, cells, 2.7);
  float dustParticles = particleLayer(broadSwarm, cells * 0.63, 9.4) * 0.72;
  float particles = clamp(fineParticles + dustParticles, 0.0, 1.0);

  float angle = atan(p.y, p.x);
  float ripple = sin(angle * 3.0 - time * 0.34) * 0.018;
  ripple += sin(angle * 7.0 + time * 0.21) * 0.007;
  float ringDistance = radius - (clamp(uRingRadius, 0.25, 0.82) + ripple);
  float ringCore = bell(ringDistance, max(uRingWidth, 0.025) * 0.54);
  float ringBloom = bell(ringDistance, max(uRingWidth, 0.025) * 2.15);
  float outerBloom = bell(ringDistance - 0.025, max(uRingWidth, 0.025) * 4.2);

  float cyanWeight = 0.5 + 0.5 * cos(angle - 0.25);
  float magentaWeight = 0.5 + 0.5 * cos(angle - 2.35);
  float goldWeight = 0.5 + 0.5 * cos(angle + 2.05);
  float weightSum = max(cyanWeight + magentaWeight + goldWeight, 0.001);
  vec3 spectrum = (
    uCyanColor * cyanWeight +
    uMagentaColor * magentaWeight +
    uGoldColor * goldWeight
  ) / weightSum;

  float colorNoise = hash21(floor(fineSwarm * cells));
  vec3 particleColor = mix(spectrum, vec3(1.0), colorNoise * 0.36);
  float glowStrength = max(uGlow, 0.0);
  vec3 color = particleColor * particles * 1.2;
  color += spectrum * ringCore * glowStrength * 0.86;
  color += spectrum * ringBloom * glowStrength * 0.24;
  color += spectrum * outerBloom * glowStrength * 0.055;

  float edgeFade = 1.0 - smoothstep(0.9, 1.0, radius);
  float alpha = particles * 0.94;
  alpha += ringCore * glowStrength * 0.74;
  alpha += ringBloom * glowStrength * 0.2;
  alpha += outerBloom * glowStrength * 0.045;
  alpha = clamp(alpha * max(uIntensity, 0.0) * edgeFade, 0.0, 1.0);
  vec3 finalColor = clamp(color * max(uIntensity, 0.0), 0.0, 1.0) * alpha;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export const spectralDustProgram: ShaderProgram = {
  name: 'spectralDust',
  fragmentSource,
};
