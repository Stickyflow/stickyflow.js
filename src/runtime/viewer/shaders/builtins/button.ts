import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uLight;
uniform float uGloss;
uniform float uDepth;
uniform float uRim;
uniform float uPressed;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float pixel = 2.0 / max(uResolution.y, 1.0);
  float pressed = clamp(uPressed, 0.0, 1.0);

  float radius = 0.9 * (1.0 - 0.025 * pressed);
  float r = length(p);
  vec2 direction = r > 0.0001 ? p / r : vec2(0.0, 1.0);
  float angle = radians(uLight);
  vec2 toLight = vec2(cos(angle), sin(angle));
  vec3 light = normalize(vec3(toLight, 0.85));

  vec3 base = dot(uColor, uColor) > 0.0 ? uColor : vec3(0.15, 0.15, 0.17);
  float depth = max(uDepth, 0.0) * (1.0 - 0.65 * pressed);
  float inside = clamp(r / radius, 0.0, 1.0);

  vec3 normal = normalize(vec3(direction * pow(inside, 1.6) * depth * 1.4, 1.0));
  float diffuse = clamp(dot(normal, light), 0.0, 1.0);
  vec3 color = base * (0.5 + 0.7 * diffuse) * (1.0 - 0.18 * pressed);

  vec3 reflected = reflect(-light, normal);
  float specular = pow(max(reflected.z, 0.0), 26.0) * max(uGloss, 0.0) * (1.0 - 0.8 * pressed);
  color += vec3(specular) * 0.9;

  float lit = max(dot(direction, toLight), 0.0);
  float away = max(dot(direction, -toLight), 0.0);
  float edge = smoothstep(0.55, 1.0, inside);
  color *= 1.0 - 0.45 * edge * away * min(depth, 1.5) - 0.12 * edge;
  color += mix(base, vec3(1.0), 0.6) * max(uRim, 0.0) * smoothstep(0.9, 1.0, inside) * lit * (1.0 - 0.7 * pressed);

  float disc = 1.0 - smoothstep(radius - pixel, radius + pixel, r);

  vec2 shadowAt = -toLight * 0.06 * (1.0 - 0.7 * pressed);
  float shadowDistance = length(p - shadowAt);
  float shadow = (1.0 - smoothstep(radius * 0.55, 0.99, shadowDistance)) * 0.55 * (1.0 - 0.4 * pressed);

  float alpha = clamp(disc + shadow * (1.0 - disc), 0.0, 1.0);
  gl_FragColor = vec4(clamp(color * disc, 0.0, 1.0), alpha);
}
`;

export const buttonProgram: ShaderProgram = {
  name: 'button',
  fragmentSource,
  replacesBaseFill: true,
};
