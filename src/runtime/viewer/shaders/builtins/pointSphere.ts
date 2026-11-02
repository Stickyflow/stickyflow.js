import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDensity;
uniform float uDotSize;
uniform float uRipple;
uniform float uSpread;
uniform float uCore;
uniform vec3 uColor;
uniform vec3 uHighlight;
varying vec2 vUv;

const float PI = 3.14159265;

// How much of a dot of a turning sphere lies at a point of the picture.
float shell(vec2 p, float size, float turn, float phase) {
  vec2 q = p / size;
  float r2 = dot(q, q);
  if (r2 >= 1.0) return 0.0;
  float z = sqrt(1.0 - r2);
  float c = cos(turn);
  float s = sin(turn);
  vec3 n = vec3(q.x * c + z * s, q.y, z * c - q.x * s);
  float wave = sin(n.y * 9.0 + phase) * cos(atan(n.x, n.z) * 3.0 - phase * 0.7);
  float latitude = asin(clamp(n.y, -1.0, 1.0)) / PI + 0.5;
  float longitude = atan(n.x, n.z) / (2.0 * PI) + 0.5;
  vec2 cell = vec2(longitude * uDensity * 2.0, latitude * uDensity);
  // The rows are shifted one by one, and the dots at the poles do not crowd.
  cell.x += floor(cell.y) * 0.5;
  vec2 f = fract(cell) - 0.5;
  f.x *= max(0.15, sqrt(max(0.0, 1.0 - n.y * n.y)));
  float dot_ = 1.0 - smoothstep(0.0, uDotSize * (0.7 + 0.6 * wave * uRipple), length(f));
  return dot_ * (0.25 + 0.75 * z) * (0.55 + 0.45 * wave);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float time = uTime * uSpeed;
  float radius = length(p);
  float a = shell(p - vec2(uSpread, 0.0), 0.8, time, time * 2.2);
  float b = shell(p + vec2(uSpread, 0.0), 0.8, -time * 0.8 + 1.7, -time * 1.8);
  float points = max(a, b) + a * b;
  float core = exp(-pow(radius / 0.42, 2.0)) * uCore;
  float glow = exp(-pow(radius / 0.8, 4.0)) * 0.1;
  vec3 color = uColor * (points + core * 0.5 + glow) + uHighlight * pow(points, 2.0) * 0.8;
  color *= uIntensity;
  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0);
  alpha *= 1.0 - smoothstep(0.96, 1.0, radius);
  gl_FragColor = vec4(min(color, vec3(alpha)), alpha);
}
`;

export const pointSphereProgram: ShaderProgram = {
  name: 'pointSphere',
  fragmentSource,
  defaultParameters: {
    speed: 0.3,
    intensity: 1.3,
    density: 46,
    dotSize: 0.3,
    ripple: 0.8,
    spread: 0.14,
    core: 0.35,
    color: '#2f7bff',
    highlight: '#bfe0ff',
  },
};
