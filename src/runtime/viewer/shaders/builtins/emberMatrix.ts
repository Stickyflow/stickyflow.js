import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uCellCount;
uniform float uGrain;
uniform vec3 uBaseColor;
uniform vec3 uTopColor;
uniform vec3 uCoreColor;
uniform vec3 uBottomColor;
uniform vec3 uCoolColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

float pixelNoise(vec2 uv) {
  vec2 pixel = floor(uv * uResolution);
  return fract(sin(dot(pixel, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius >= 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float cells = max(uCellCount, 1.0);
  vec2 grid = (p + 1.0) * cells * 0.5;
  vec2 cell = fract(grid) - 0.5;
  vec2 samplePoint = (floor(grid) + 0.5) * 2.0 / cells - 1.0;
  vec2 q = samplePoint;
  q.x += sin(samplePoint.y * 3.4 + time * 0.34) * 0.035;
  q.y += sin(samplePoint.x * 4.0 - time * 0.29) * 0.045;

  float upperCurve = 0.56 + 0.11 * sin(q.x * 3.1 + time * 0.41);
  float topLight = band(q.y - upperCurve, 0.25) * (0.48 + 0.52 * abs(q.x));
  topLight += band(q.x + 0.77, 0.28) * band(q.y - 0.46, 0.35) * 0.58;
  topLight += band(q.x - 0.76, 0.28) * band(q.y - 0.43, 0.36) * 0.68;
  topLight *= 1.0 - band(q.x + 0.02, 0.45) * band(q.y - 0.78, 0.28) * 0.88;

  float coreLight = band(q.x + 0.02 + 0.08 * sin(time * 0.28), 0.58);
  coreLight *= band(q.y + 0.19 + 0.07 * sin(q.x * 3.0 - time * 0.31), 0.44);
  float bottomLight = band(q.y + 0.82, 0.38) * band(q.x - 0.02, 0.85);
  float coolLight = band(q.x + 0.79, 0.31) * band(q.y + 0.03, 0.29);
  coolLight += band(q.x - 0.89, 0.23) * band(q.y + 0.02, 0.25) * 0.48;

  float centerCut = band(q.y - 0.12 + 0.08 * sin(q.x * 3.2 + time * 0.33), 0.16);
  centerCut *= band(q.x + 0.03, 0.99);
  float rightCut = band(q.x - 0.68, 0.35) * band(q.y + 0.37, 0.26);
  float occlusion = clamp(centerCut * 0.78 + rightCut * 0.79, 0.0, 0.9);

  vec3 color = uBaseColor;
  color += uTopColor * topLight * 0.91;
  color += uCoreColor * coreLight * 1.05;
  color += uBottomColor * bottomLight * 0.86;
  color += uCoolColor * coolLight * 0.68;
  color *= 1.0 - occlusion;

  float squareRadius = max(abs(cell.x), abs(cell.y));
  float dot = 1.0 - smoothstep(0.23, 0.43, squareRadius);
  color *= 0.21 + dot * 0.79;
  float noise = (pixelNoise(vUv) - 0.5) * max(uGrain, 0.0);
  color += vec3(noise) * (0.25 + dot * 0.75);

  float edge = 1.0 - smoothstep(0.955, 0.995, radius);
  gl_FragColor = vec4(clamp(color * max(uIntensity, 0.0) * edge, 0.0, 1.0), edge);
}
`;

export const emberMatrixProgram: ShaderProgram = {
  name: 'emberMatrix',
  fragmentSource,
};
