import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uColor;
uniform vec3 uHighlightColor;
varying vec2 vUv;

float band(float distance, float width) {
  return exp(-pow(distance / width, 2.0));
}

float glassDistance(vec2 p, float time) {
  float angle = atan(p.y, p.x);
  float edge = 0.72;
  edge += sin(angle * 3.0 + time * 0.52) * 0.038;
  edge += sin(angle * 5.0 - time * 0.37 + 1.6) * 0.025;
  edge += sin(angle * 9.0 + time * 0.29) * 0.008;
  return length(p) - edge;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.y += 0.025;
  float time = uTime * max(uSpeed, 0.0);
  float distance = glassDistance(p, time);
  float body = 1.0 - smoothstep(-0.012, 0.01, distance);
  float halo = band(max(distance, 0.0), 0.12) * 0.24;
  float alpha = body + (1.0 - body) * halo;
  if (alpha < 0.002) discard;

  float lowerLight = 1.0 - smoothstep(-0.6, 0.45, p.y);
  float liquid = 0.5 + 0.5 * sin(p.x * 3.5 - p.y * 2.2 + time * 0.61);
  vec3 color = mix(uBaseColor, uColor, 0.17 + lowerLight * 0.3 + liquid * 0.09);
  color += uColor * band(p.x + 0.36, 0.42) * band(p.y + 0.12, 0.5) * 0.16;
  color *= 0.55 + 0.45 * smoothstep(-0.52, 0.5, p.y + 0.2);

  float innerFold = p.y + 0.22 + 0.19 * sin(p.x * 4.0 + time * 0.53);
  float secondFold = p.y - 0.42 + 0.11 * sin(p.x * 5.5 - time * 0.42);
  float foldLight = band(innerFold, 0.041) * smoothstep(-0.65, -0.1, p.x);
  foldLight += band(secondFold, 0.027) * smoothstep(0.05, 0.6, p.x);
  color += uHighlightColor * foldLight * 0.64;
  color += uColor * band(innerFold + 0.07, 0.065) * 0.31;
  float softReflection = band(p.x + 0.3 + 0.1 * sin(p.y * 3.5 + time * 0.35), 0.2);
  softReflection *= band(p.y - 0.38, 0.35);
  color += uHighlightColor * softReflection * 0.1;

  float dome = sqrt(max(0.04, 1.0 - dot(p, p) / 0.62));
  vec3 surfaceNormal = normalize(vec3(p.x * 1.18, p.y * 1.18, dome));
  surfaceNormal.xy += vec2(sin(p.y * 8.0 + time * 0.31), cos(p.x * 7.0 - time * 0.27)) * 0.065;
  surfaceNormal = normalize(surfaceNormal);
  vec3 reflection = reflect(vec3(0.0, 0.0, -1.0), surfaceNormal);
  float softbox = band(reflection.x + 0.42, 0.34) * band(reflection.y - 0.43, 0.24);
  float sidebox = band(reflection.x - 0.57, 0.19) * band(reflection.y + 0.11, 0.5);
  color += uHighlightColor * softbox * 0.21;
  color += uColor * sidebox * 0.22;

  float e = 0.008;
  vec2 normal = normalize(vec2(
    glassDistance(p + vec2(e, 0.0), time) - glassDistance(p - vec2(e, 0.0), time),
    glassDistance(p + vec2(0.0, e), time) - glassDistance(p - vec2(0.0, e), time)
  ));
  float light = pow(max(0.0, dot(normal, normalize(vec2(-0.62, 0.78)))), 2.0);
  float sideLight = pow(max(0.0, dot(normal, normalize(vec2(0.8, -0.58)))), 4.0);
  float rim = band(distance + 0.012, 0.031);
  float sharpRim = band(distance + 0.004, 0.009);
  color += uColor * rim * (0.25 + light * 0.53);
  color += uHighlightColor * sharpRim * (light * 0.78 + sideLight * 0.38);
  color += uHighlightColor * band(distance + 0.09, 0.025) * light * 0.23;
  color += uColor * band(length(p - vec2(0.27, -0.31)) - 0.26, 0.09) * 0.1;

  vec3 premultiplied = color * body + uColor * (1.0 - body) * halo * 0.48;
  gl_FragColor = vec4(clamp(premultiplied * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const violetGlassProgram: ShaderProgram = {
  name: 'violetGlass',
  fragmentSource,
};
