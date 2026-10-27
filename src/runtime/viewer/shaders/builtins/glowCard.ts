import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uGlowHeight;
uniform float uGlowSpread;
uniform float uCore;
uniform float uRim;
uniform float uGrain;
uniform float uWarp;
uniform float uCornerRadius;
uniform vec3 uBaseColor;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;

float boxDistance(vec2 uv) {
  vec2 halfBox = uResolution * 0.5;
  float radius = uCornerRadius * min(uResolution.x, uResolution.y);
  vec2 q = abs(uv * uResolution - halfBox) - halfBox + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float blob(vec2 p, vec2 center, vec2 size) {
  vec2 d = (p - center) / size;
  return exp(-dot(d, d));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return 0.5 * noise(p) + 0.25 * noise(p * 2.03 + 3.1) + 0.125 * noise(p * 4.01 + 7.7);
}

void main() {
  float distance = boxDistance(vUv);
  float shape = 1.0 - smoothstep(-1.0, 1.0, distance);
  if (shape <= 0.0) discard;

  float t = uTime * max(uSpeed, 0.0);
  float aspect = uResolution.x / uResolution.y;
  float up = vUv.y;
  float height = clamp(uGlowHeight, 0.05, 1.0);
  float spread = max(uGlowSpread, 0.05);

  // The body is the base color with a faint lift toward the top, like glass that catches the light.
  vec3 color = uBaseColor + vec3(0.035) * smoothstep(0.55, 1.0, up);

  // Three soft lights sit low in the card and drift slowly; the middle one is the broadest.
  vec2 p = vec2(vUv.x * aspect, up);
  // The lights are bent by slow noise, so their edges curl like smoke instead of staying round.
  vec2 bend = vec2(fbm(p * 2.6 + vec2(t * 0.6, 0.0)), fbm(p * 2.6 + vec2(5.2, -t * 0.5))) - 0.35;
  p += bend * max(uWarp, 0.0) * 0.45;
  float wander = 0.05 * sin(t);
  float a = blob(p, vec2((0.18 + wander) * aspect, 0.0), vec2(0.5 * spread * aspect, 0.42 * height));
  float b = blob(p, vec2((0.52 - wander) * aspect, -0.04), vec2(0.62 * spread * aspect, 0.5 * height));
  float c = blob(p, vec2((0.86 + wander * 0.6) * aspect, 0.02), vec2(0.5 * spread * aspect, 0.44 * height));
  // Each light is thicker in some places than in others, so the colors mix unevenly.
  float patchy = fbm(p * 4.0 + 11.0);
  a *= 0.55 + 0.9 * patchy;
  b *= 0.55 + 0.9 * (1.0 - patchy);
  c *= 0.55 + 0.9 * fbm(p * 4.0 + 23.0);
  vec3 glow = uColorA * a + uColorB * b + uColorC * c;

  // A haze reaches higher than the lights, so the color fades out into the body.
  float haze = smoothstep(height, 0.0, up);
  glow += mix(uColorB, uColorA, vUv.x) * haze * haze * 0.35;
  color += glow * max(uIntensity, 0.0);

  // Near the bottom edge the lights are so strong that they turn white.
  float hot = smoothstep(height * 0.38, 0.0, up) * (a + b + c) * clamp(uCore, 0.0, 1.0);
  color = mix(color, vec3(0.93, 0.95, 1.0), clamp(hot, 0.0, 1.0));

  // A thin rim along the edge, strongest at the top where the glass is lit from above.
  float rim = (1.0 - smoothstep(0.0, 1.6, -distance)) * smoothstep(0.0, 1.0, -distance + 1.0);
  color += vec3(0.62, 0.66, 0.78) * rim * max(uRim, 0.0) * (0.35 + 0.65 * smoothstep(0.2, 1.0, up));

  // The grit sits in the lit parts and fades in the dark body, as on film.
  float lit = clamp(dot(glow, vec3(0.45)) * max(uIntensity, 0.0) + hot, 0.0, 1.0);
  float grit = hash(gl_FragCoord.xy) - 0.5;
  grit += 0.5 * (hash(floor(gl_FragCoord.xy * 0.5) + 17.0) - 0.5);
  color += grit * max(uGrain, 0.0) * (0.3 + 2.2 * lit * (1.0 - 0.5 * lit));
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), shape);
}
`;

export const glowCardProgram: ShaderProgram = {
  name: 'glowCard',
  fragmentSource,
  defaultParameters: {
    speed: 0.12,
    intensity: 1,
    glowHeight: 0.55,
    glowSpread: 1,
    core: 0.7,
    rim: 0.55,
    grain: 0.12,
    warp: 1,
    cornerRadius: 0.08,
    baseColor: '#0b0b12',
    colorA: '#2f6bff',
    colorB: '#9d5cff',
    colorC: '#34d3c4',
  },
};
