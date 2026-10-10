import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uBottomColor;
uniform vec3 uTopColor;
uniform float uIntensity;
uniform float uSpeed;
uniform float uDensity;
uniform float uPointSize;
uniform float uWarp;
varying vec2 vUv;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 rotateY(vec3 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float time = uTime * max(uSpeed, 0.0);
  float angle = atan(p.y, p.x);
  float boundary = 0.88;
  boundary += sin(angle * 3.0 - time * 0.7) * 0.06;
  boundary += sin(angle * 7.0 + time * 0.43) * 0.024;
  boundary += sin(angle * 11.0 - time * 0.29) * 0.012;

  vec2 q = p / boundary;
  float radiusSquared = dot(q, q);
  if (radiusSquared > 1.0) discard;

  float depth = sqrt(max(0.0, 1.0 - radiusSquared));
  vec3 surface = rotateY(vec3(q, depth), time * 0.22);
  vec2 sphereUv = vec2(
    atan(surface.z, surface.x) / TAU + 0.5,
    asin(clamp(surface.y, -1.0, 1.0)) / PI + 0.5
  );

  float warp = max(uWarp, 0.0);
  sphereUv.x += sin(sphereUv.y * 18.0 + time * 1.1) * warp * 0.022;
  sphereUv.x += sin(sphereUv.y * 41.0 - time * 0.54) * warp * 0.008;
  sphereUv.y += sin(sphereUv.x * 13.0 - time * 0.83) * warp * 0.018;
  sphereUv.y += sin((sphereUv.x + sphereUv.y) * 29.0 + time * 0.37) * warp * 0.007;

  float density = max(uDensity, 24.0);
  vec2 gridSize = vec2(density, density * 0.62);
  vec2 gridUv = sphereUv * gridSize;
  vec2 cell = floor(gridUv);
  vec2 point = fract(gridUv) - 0.5;
  point.x += sin(cell.y * 1.73 + time * 0.65) * warp * 0.12;
  point.y += sin(cell.x * 0.91 - time * 0.48) * warp * 0.055;

  float pointSize = max(uPointSize, 0.07);
  float sizeVariation = mix(0.72, 1.2, hash(cell + 4.7));
  float particle = 1.0 - smoothstep(
    pointSize * sizeVariation * 0.5,
    pointSize * sizeVariation,
    length(point)
  );

  float rim = pow(1.0 - depth, 0.7);
  float ridge = sin(sphereUv.y * 46.0 + sphereUv.x * 9.0 - time * 1.2) * 0.5 + 0.5;
  float light = 0.3 + rim * 0.72 + ridge * 0.18;
  light *= mix(0.68, 1.2, hash(cell + 23.1));
  float top = smoothstep(0.18, 0.82, vUv.y);
  vec3 particleColor = mix(uBottomColor, uTopColor, top);
  vec3 color = particleColor * light * max(uIntensity, 0.0);
  float edgeFade = mix(0.58, 1.0, smoothstep(0.0, 0.1, depth));
  float alpha = particle * edgeFade * clamp(uIntensity, 0.0, 1.5);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const waveSphereProgram: ShaderProgram = {
  name: 'waveSphere',
  fragmentSource,
};
