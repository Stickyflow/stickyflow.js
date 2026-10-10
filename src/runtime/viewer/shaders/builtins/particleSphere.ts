import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uBottomColor;
uniform vec3 uTopColor;
uniform float uIntensity;
uniform float uSpeed;
uniform float uDensity;
uniform float uPointSize;
uniform float uMotion;
uniform float uDrift;
varying vec2 vUv;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p) {
  return vec2(hash(p), hash(p + vec2(19.19, 73.73)));
}

vec3 rotateX(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 rotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec2 particleLayer(
  vec3 surface,
  float density,
  float pointSize,
  float danceTime,
  float driftStrength,
  float population,
  float seed
) {
  vec2 sphereUv = vec2(
    atan(surface.z, surface.x) / TAU + 0.5,
    asin(clamp(surface.y, -1.0, 1.0)) / PI + 0.5
  );
  vec2 gridSize = vec2(density, density * 0.5);
  vec2 gridUv = sphereUv * gridSize;
  vec2 cell = floor(gridUv);
  vec2 randomCell = cell + seed;
  vec2 jitter = (hash2(randomCell) - 0.5) * 0.9;
  float phase = hash(randomCell + 17.3) * TAU;
  vec2 drift = (
    vec2(
      sin(danceTime * 2.1 + phase),
      cos(danceTime * 1.7 + phase * 1.41)
    ) * 0.68 +
    vec2(
      cos(danceTime * 3.3 + phase * 0.73),
      sin(danceTime * 2.7 + phase * 1.87)
    ) * 0.32
  ) * driftStrength;
  vec2 point = fract(gridUv) - 0.5 - jitter - drift;
  float randomSize = mix(0.62, 1.18, hash(randomCell + 8.3));
  float size = pointSize * randomSize;
  float particle = 1.0 - smoothstep(size * 0.55, size, length(point));
  particle *= step(hash(randomCell + 91.1), population);
  float brightness = mix(0.55, 1.2, hash(randomCell + 31.7));
  return vec2(particle, brightness);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radiusSquared = dot(p, p);
  if (radiusSquared > 1.0) discard;

  float depth = sqrt(max(0.0, 1.0 - radiusSquared));
  vec3 frontNormal = vec3(p, depth);
  vec3 backNormal = vec3(p, -depth);
  float rotationTime = uTime * max(uSpeed, 0.0);
  float danceTime = uTime * max(uMotion, 0.0);
  vec3 frontSurface = rotateY(rotateX(frontNormal, -0.18), rotationTime * 1.35);
  vec3 backSurface = rotateY(rotateX(backNormal, -0.18), rotationTime * 1.35);
  float density = max(uDensity, 24.0);
  float pointSize = max(uPointSize, 0.08);
  float driftStrength = max(uDrift, 0.0);
  float latitude = smoothstep(0.04, 0.9, abs(p.y));
  float population = mix(0.28, 0.72, latitude) + smoothstep(0.05, 0.9, p.y) * 0.28;
  vec2 frontParticle = particleLayer(
    frontSurface,
    density,
    pointSize,
    danceTime,
    driftStrength,
    population,
    0.0
  );
  vec2 backParticle = particleLayer(
    backSurface,
    density * 0.94,
    pointSize * 0.9,
    danceTime,
    driftStrength * 0.82,
    population,
    43.7
  );
  float equatorDensity = mix(0.22, 1.0, smoothstep(0.02, 0.22, abs(p.y + 0.015)));
  float rimFade = smoothstep(0.0, 0.12, depth);
  float frontAlpha = frontParticle.x * equatorDensity * rimFade;
  float backAlpha = backParticle.x * equatorDensity * rimFade * 0.34;
  float alpha = 1.0 - (1.0 - frontAlpha) * (1.0 - backAlpha);
  float light = (
    frontAlpha * frontParticle.y * (0.48 + depth * 0.7) +
    backAlpha * backParticle.y * 0.48
  ) / max(frontAlpha + backAlpha, 0.001);
  float top = smoothstep(-0.02, 0.42, p.y);
  vec3 particleColor = mix(uBottomColor, uTopColor, top);
  float crown = exp(-pow((p.y - 0.86) / 0.11, 2.0)) * smoothstep(0.0, 0.5, depth);
  vec3 color = particleColor * light * (1.0 + crown * 1.6) * max(uIntensity, 0.0);
  alpha *= clamp(uIntensity, 0.0, 1.5);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const particleSphereProgram: ShaderProgram = {
  name: 'particleSphere',
  fragmentSource,
};
