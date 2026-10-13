import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uCellCount;
uniform float uDensity;
uniform vec3 uBaseColor;
uniform vec3 uTopColor;
uniform vec3 uWarmColor;
uniform vec3 uCenterColor;
uniform vec3 uVioletColor;
uniform vec3 uBottomColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 cell = floor(p);
  vec2 blend = fract(p);
  blend = blend * blend * (3.0 - 2.0 * blend);
  float lower = mix(hash(cell), hash(cell + vec2(1.0, 0.0)), blend.x);
  float upper = mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), blend.x);
  return mix(lower, upper, blend.y);
}

vec3 strandColor(float y) {
  vec3 color = mix(uBottomColor, uVioletColor, smoothstep(-0.9, -0.43, y));
  color = mix(color, uCenterColor, smoothstep(-0.38, 0.05, y));
  color = mix(color, uWarmColor, smoothstep(0.14, 0.48, y));
  return mix(color, uTopColor, smoothstep(0.64, 0.9, y));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius >= 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float cells = max(uCellCount, 1.0);
  vec2 grid = (p + 1.0) * cells * 0.5;
  vec2 cellId = floor(grid);
  vec2 q = (cellId + 0.5) * 2.0 / cells - 1.0;
  vec2 flow = vec2(
    0.1 * sin(time * 0.48 + q.y * 2.6),
    0.08 * cos(time * 0.4 + q.x * 2.1)
  );
  vec2 movingQ = q + flow;

  float path = -0.29 + 0.19 * sin(movingQ.y * 4.0 + time * 0.27);
  path += 0.09 * sin(movingQ.y * 7.7 - time * 0.19);
  float strand = band(movingQ.x - path, 0.26) * 0.11;
  float top = band(movingQ.x + 0.52, 0.28) * band(movingQ.y - 0.78, 0.19) * 0.75;
  float warm = band(movingQ.x + 0.46, 0.2) * band(movingQ.y - 0.47, 0.23) * 0.76;
  float center = band(movingQ.x + 0.06, 0.25) * band(movingQ.y - 0.02, 0.21) * 1.14;
  float lower = band(movingQ.x + 0.38, 0.32) * band(movingQ.y + 0.48, 0.27) * 0.86;
  float bottom = band(movingQ.x + 0.56, 0.36) * band(movingQ.y + 0.85, 0.19) * 0.88;
  float blue = band(movingQ.x - 0.28, 0.19) * band(movingQ.y + 0.64, 0.18) * 0.94;
  float field = strand + top + warm + center + lower + bottom + blue;
  field *= 0.35 + 1.25 * noise(movingQ * 5.1 + vec2(time * 0.075, -time * 0.04));

  float chance = clamp(field * max(uDensity, 0.0), 0.0, 0.96);
  float seed = hash(cellId);
  float active = smoothstep(seed - 0.055, seed + 0.055, chance);
  vec2 local = fract(grid) - 0.5;
  local -= vec2(
    0.11 * sin(time * 0.72 + seed * 6.28318),
    0.11 * cos(time * 0.61 + seed * 4.71239)
  );
  float growth = 0.78 + 0.34 * (0.5 + 0.5 * sin(time * 0.83 + seed * 5.3));
  float size = mix(0.27, 0.34, hash(cellId + vec2(19.3, 7.1))) * growth;
  float squareRadius = max(abs(local.x), abs(local.y));
  float outer = 1.0 - smoothstep(size - 0.045, size + 0.015, squareRadius);
  float inner = 1.0 - smoothstep(size - 0.17, size - 0.105, squareRadius);
  float outline = max(outer - inner, 0.0);
  float glow = band(squareRadius - size + 0.075, 0.115) * 0.24;

  float pulse = 0.76 + 0.24 * sin(time * 1.1 - q.y * 5.1 + seed * 6.28318);
  float variation = 0.43 + 0.57 * hash(cellId + vec2(3.7, 27.4));
  float highlight = band(movingQ.x + 0.07, 0.25) * band(movingQ.y - 0.02, 0.24);
  vec3 colorSum = strandColor(movingQ.y) * strand;
  colorSum += uTopColor * top + uWarmColor * warm + uCenterColor * center;
  colorSum += uVioletColor * lower + uBottomColor * (bottom + blue);
  vec3 cellColor = colorSum / max(strand + top + warm + center + lower + bottom + blue, 0.001);
  cellColor = mix(cellColor, vec3(1.0, 0.96, 0.76), highlight * 0.54);
  vec3 color = uBaseColor + cellColor * active * variation * pulse * (outline + glow);

  float edge = 1.0 - smoothstep(0.965, 0.997, radius);
  gl_FragColor = vec4(clamp(color * max(uIntensity, 0.0) * edge, 0.0, 1.0), edge);
}
`;

export const pixelConstellationProgram: ShaderProgram = {
  name: 'pixelConstellation',
  fragmentSource,
};
