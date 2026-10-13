import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uCoolColor;
uniform vec3 uWarmColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float time = uTime * max(uSpeed, 0.0);
  vec2 q = p;
  q.x += sin(p.y * 4.0 + time * 0.58) * 0.02;
  q.y += sin(p.x * 3.3 - time * 0.43) * 0.013;
  float distance = length(q) - 0.64;
  float body = 1.0 - smoothstep(-0.012, 0.01, distance);
  float nearGlow = band(max(distance, 0.0), 0.19) * 0.62;
  float wideGlow = band(max(distance, 0.0), 0.48) * 0.3;
  float frameFade = 1.0 - smoothstep(0.88, 1.0, length(p));
  float halo = max(nearGlow, wideGlow) * frameFade;
  float alpha = body + (1.0 - body) * halo;
  if (alpha < 0.002) discard;

  float vertical = 0.5 + 0.5 * q.y;
  float warmWeight = smoothstep(-0.44, 0.42, q.x + q.y * 0.14 + sin(time * 0.62 + q.y * 3.0) * 0.065);
  vec3 glowColor = mix(uCoolColor, uWarmColor, warmWeight);
  float breath = 0.78 + 0.22 * sin(time * 1.12 + q.y * 3.0);
  float rim = band(distance + 0.014, 0.042);
  float edge = band(distance + 0.006, 0.014);
  float bevel = band(distance + 0.092, 0.07);

  vec3 color = uBaseColor * (0.62 + 0.23 * vertical);
  color += uWarmColor * smoothstep(-0.68, 0.6, q.x) * 0.13;
  color += uWarmColor * band(q.x - 0.38, 0.32) * band(q.y + 0.14, 0.74) * 0.11;
  color += uCoolColor * band(q.x + 0.28, 0.42) * band(q.y - 0.47, 0.35) * 0.11;
  color *= 1.0 - band(q.x - 0.06, 0.3) * band(q.y + 0.2, 0.5) * 0.46;
  color += glowColor * bevel * 0.14;
  color += glowColor * rim * 0.41 * breath;
  color += mix(uCoolColor, vec3(1.0), 0.45) * edge * (1.0 - warmWeight) * 0.43;
  color += mix(uWarmColor, vec3(1.0), 0.38) * edge * warmWeight * 0.45;

  float topFlare = band(q.y - 0.6, 0.07) * band(q.x + 0.2, 0.28);
  float bottomFlare = band(q.y + 0.61, 0.07) * band(q.x - 0.15, 0.35);
  color += uCoolColor * topFlare * 0.39;
  color += uWarmColor * bottomFlare * 0.31;
  vec3 premultiplied = color * body + glowColor * (1.0 - body) * halo * breath;
  gl_FragColor = vec4(clamp(premultiplied * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const lumenPortalProgram: ShaderProgram = {
  name: 'lumenPortal',
  fragmentSource,
};
