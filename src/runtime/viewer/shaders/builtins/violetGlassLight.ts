import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uColor;
uniform vec3 uHighlightColor;
uniform vec3 uShadowColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

float glassDistance(vec2 p, float time) {
  float angle = atan(p.y, p.x);
  float edge = 0.69;
  edge += sin(angle * 3.0 + time * 0.48) * 0.025;
  edge += sin(angle * 5.0 - time * 0.36 + 1.7) * 0.016;
  return length(p) - edge;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float time = uTime * max(uSpeed, 0.0);
  float distance = glassDistance(p, time);
  float body = 1.0 - smoothstep(-0.012, 0.012, distance);
  float outside = band(max(distance, 0.0), 0.13) * 0.16;
  outside *= 1.0 - smoothstep(0.86, 1.0, length(p));
  float alpha = body * 0.94 + (1.0 - body) * outside;
  if (alpha < 0.002) discard;

  float lowerTint = 1.0 - smoothstep(-0.54, 0.46, p.y);
  float flow = 0.5 + 0.5 * sin(p.x * 3.8 - p.y * 2.4 + time * 0.57);
  vec3 color = mix(uBaseColor, uColor, 0.08 + lowerTint * 0.19 + flow * 0.045);
  color *= 1.0 - band(p.x - 0.27, 0.31) * band(p.y + 0.25, 0.48) * 0.11;

  float fold = p.y + 0.17 + 0.15 * sin(p.x * 4.1 + time * 0.49);
  float secondFold = p.y - 0.43 + 0.08 * sin(p.x * 5.2 - time * 0.32);
  float foldShade = band(fold + 0.045, 0.055) * smoothstep(-0.55, 0.18, p.x);
  foldShade += band(secondFold + 0.03, 0.038) * smoothstep(-0.1, 0.58, p.x);
  color = mix(color, uShadowColor, foldShade * 0.13);
  color += uHighlightColor * band(fold, 0.028) * 0.11;
  color += uHighlightColor * band(secondFold, 0.019) * 0.09;

  float dome = sqrt(max(0.04, 1.0 - dot(p, p) / 0.57));
  vec3 normal = normalize(vec3(p.x * 1.15, p.y * 1.15, dome));
  normal.xy += vec2(sin(p.y * 7.0 + time * 0.29), cos(p.x * 6.0 - time * 0.24)) * 0.04;
  vec3 reflection = reflect(vec3(0.0, 0.0, -1.0), normalize(normal));
  float softbox = band(reflection.x + 0.45, 0.28) * band(reflection.y - 0.39, 0.22);
  color += uHighlightColor * softbox * 0.12;

  float rim = band(distance + 0.018, 0.041);
  float thinRim = band(distance + 0.004, 0.012);
  float innerShade = band(distance + 0.094, 0.055);
  float upperLight = smoothstep(-0.34, 0.78, p.y - p.x * 0.24);
  color = mix(color, uShadowColor, innerShade * (0.08 + (1.0 - upperLight) * 0.1));
  color = mix(color, uColor, rim * (0.36 + upperLight * 0.15));
  color = mix(color, uShadowColor, thinRim * (1.0 - upperLight) * 0.29);
  color += uHighlightColor * thinRim * upperLight * 0.17;

  vec3 premultiplied = color * body * 0.94;
  premultiplied += mix(uShadowColor, uColor, 0.36) * (1.0 - body) * outside;
  gl_FragColor = vec4(clamp(premultiplied * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const violetGlassLightProgram: ShaderProgram = {
  name: 'violetGlassLight',
  fragmentSource,
};
