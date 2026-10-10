import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uCoolColor;
uniform vec3 uWarmColor;
uniform vec3 uShadowColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float time = uTime * max(uSpeed, 0.0);
  vec2 q = p;
  q.x += sin(p.y * 4.1 + time * 0.55) * 0.013;
  q.y += sin(p.x * 3.4 - time * 0.41) * 0.01;
  float distance = length(q) - 0.65;
  float body = 1.0 - smoothstep(-0.012, 0.012, distance);
  float nearHalo = band(max(distance, 0.0), 0.12) * 0.19;
  float wideHalo = band(max(distance, 0.0), 0.28) * 0.055;
  float frameFade = 1.0 - smoothstep(0.89, 1.0, length(p));
  float outside = max(nearHalo, wideHalo) * frameFade;
  float alpha = body * 0.96 + (1.0 - body) * outside;
  if (alpha < 0.002) discard;

  float warmWeight = smoothstep(-0.46, 0.47, q.x + q.y * 0.17 + sin(time * 0.58 + q.y * 3.0) * 0.052);
  vec3 rimColor = mix(uCoolColor, uWarmColor, warmWeight);
  float breath = 0.84 + 0.16 * sin(time * 0.91 + q.y * 2.5);
  float innerRim = band(distance + 0.038, 0.052);
  float outerRim = band(distance + 0.002, 0.025);
  float fineEdge = band(distance + 0.008, 0.01);
  float bevelShade = band(distance + 0.11, 0.055);

  vec3 color = uBaseColor;
  color = mix(color, uCoolColor, band(q.x + 0.27, 0.39) * band(q.y - 0.35, 0.43) * 0.09);
  color = mix(color, uWarmColor, band(q.x - 0.31, 0.43) * band(q.y + 0.31, 0.48) * 0.085);
  color = mix(color, uShadowColor, bevelShade * 0.11);
  color = mix(color, rimColor, innerRim * 0.46 * breath);
  color = mix(color, rimColor, outerRim * 0.62 * breath);
  color = mix(color, uShadowColor, fineEdge * 0.12);

  float topGlint = band(q.y - 0.6, 0.06) * band(q.x + 0.2, 0.22);
  float bottomGlint = band(q.y + 0.61, 0.06) * band(q.x - 0.16, 0.29);
  color += uCoolColor * topGlint * 0.12;
  color += uWarmColor * bottomGlint * 0.1;

  vec3 premultiplied = color * body * 0.96;
  premultiplied += mix(uShadowColor, rimColor, 0.58) * (1.0 - body) * outside * breath;
  gl_FragColor = vec4(clamp(premultiplied * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const lumenPortalLightProgram: ShaderProgram = {
  name: 'lumenPortalLight',
  fragmentSource,
};
