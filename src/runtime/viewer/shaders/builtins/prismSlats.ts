import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uRibCount;
uniform float uGrain;
uniform vec3 uBaseColor;
uniform vec3 uCoolColor;
uniform vec3 uWarmColor;
uniform vec3 uHighlightColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

float lightField(vec2 p, float time) {
  float upperCurve = 0.43 + 0.16 * sin(p.x * 2.8 + time * 0.58) - p.x * 0.08;
  float lowerCurve = -0.46 + 0.13 * sin(p.x * 2.9 - time * 0.43 + 1.4);
  float upper = band(p.y - upperCurve, 0.2) * band(p.x + 0.03, 0.88);
  float lower = band(p.y - lowerCurve, 0.19) * band(p.x - 0.05, 0.85);
  float leftColumn = band(p.x + 0.39 + 0.1 * sin(p.y * 2.9 + time * 0.5), 0.23);
  leftColumn *= band(p.y + 0.01, 0.59);
  float centerShadow = 1.0 - band(p.x - 0.35, 0.46) * band(p.y + 0.01, 0.28) * 0.9;
  float drift = 0.84 + 0.16 * sin(p.x * 3.5 - p.y * 2.2 + time * 0.72);
  return clamp((upper + lower + leftColumn * 0.74) * centerShadow * drift, 0.0, 1.5);
}

float grain(vec2 uv) {
  vec2 pixel = floor(uv * uResolution);
  return fract(sin(dot(pixel, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius >= 1.0) discard;
  float time = uTime * max(uSpeed, 0.0);

  float field = lightField(p, time);
  float redField = lightField(p + vec2(0.027, 0.0), time);
  float blueField = lightField(p - vec2(0.027, 0.0), time);
  float coolRegion = band(p.x + 0.58, 0.38) * 0.74;
  float warmRegion = band(p.x + 0.02, 0.34) * band(p.y + 0.08, 0.75) * 0.88;
  vec3 spectralTint = mix(uHighlightColor, uCoolColor, coolRegion);
  spectralTint = mix(spectralTint, uWarmColor, warmRegion);
  vec3 light = spectralTint * field * 1.25;
  light += uWarmColor * max(redField - blueField, 0.0) * 2.6;
  light += uCoolColor * max(blueField - redField, 0.0) * 2.6;

  float ribCoordinate = (p.x + 1.0) * max(uRibCount, 1.0) * 0.5;
  float rib = fract(ribCoordinate);
  float glassFace = smoothstep(0.08, 0.18, rib) * (1.0 - smoothstep(0.77, 0.94, rib));
  float groove = 1.0 - glassFace;
  float refraction = 0.8 + 0.2 * sin(rib * 3.14159);
  vec3 color = uBaseColor + light * (0.12 + glassFace * 0.95) * refraction;
  color *= 1.0 - groove * 0.83;

  float leftEdge = band(rib - 0.18, 0.028);
  float rightEdge = band(rib - 0.79, 0.04);
  color += mix(uCoolColor, uHighlightColor, 0.48) * leftEdge * (0.07 + field * 0.19);
  color += uHighlightColor * rightEdge * (0.025 + field * 0.075);
  color += uCoolColor * band(p.x + 0.78, 0.28) * band(p.y, 0.7) * 0.09;

  float noise = (grain(vUv) - 0.5) * max(uGrain, 0.0);
  color += vec3(noise) * (0.18 + field * 0.82);
  float fade = 1.0 - smoothstep(0.88, 1.0, radius);
  gl_FragColor = vec4(clamp(color * max(uIntensity, 0.0) * fade, 0.0, 1.0), fade);
}
`;

export const prismSlatsProgram: ShaderProgram = {
  name: 'prismSlats',
  fragmentSource,
};
