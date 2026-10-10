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
  float warp = max(uWarp, 0.0);
  vec2 flow = vec2(
    sin(p.y * 4.8 - time * 1.15) + 0.45 * sin(p.x * 3.1 + p.y * 2.2 + time * 0.72),
    sin(p.x * 4.2 + time * 0.9) + 0.4 * sin(p.y * 5.3 - p.x * 1.7 - time * 0.64)
  ) * warp * 0.075;
  vec2 q = (p + flow) / 0.88;
  float radiusSquared = dot(q, q);
  if (radiusSquared > 1.0) discard;

  float depth = sqrt(max(0.0, 1.0 - radiusSquared));
  vec3 surface = rotateY(vec3(q, depth), time * 0.22);
  vec2 sphereUv = vec2(
    atan(surface.z, surface.x) / TAU + 0.5,
    asin(clamp(surface.y, -1.0, 1.0)) / PI + 0.5
  );

  sphereUv.x += sin(sphereUv.y * 12.0 + time * 0.8) * warp * 0.016;
  sphereUv.y += sin(sphereUv.x * 10.0 - time * 0.62) * warp * 0.014;
  sphereUv.x += sin((sphereUv.x + sphereUv.y) * 18.0 - time * 0.46) * warp * 0.005;

  float density = max(uDensity, 24.0);
  vec2 gridSize = vec2(density, density * 0.62);
  vec2 gridUv = sphereUv * gridSize;
  vec2 cell = floor(gridUv);
  vec2 point = fract(gridUv) - 0.5;

  float pointSize = max(uPointSize, 0.07);
  float sizeVariation = mix(0.72, 1.2, hash(cell + 4.7));
  float dotRadius = pointSize * sizeVariation;
  float pixelWidth = gridSize.x / max(uResolution.x, 1.0) * 0.5;
  float particle = 1.0 - smoothstep(
    max(0.0, dotRadius - pixelWidth),
    dotRadius + pixelWidth,
    length(point)
  );

  float rim = pow(1.0 - depth, 0.7);
  float ridge = sin(sphereUv.y * 46.0 + sphereUv.x * 9.0 - time * 1.2) * 0.5 + 0.5;
  float light = 0.3 + rim * 0.72 + ridge * 0.18;
  light *= mix(0.68, 1.2, hash(cell + 23.1));
  float top = smoothstep(0.18, 0.82, vUv.y);
  vec3 particleColor = mix(uBottomColor, uTopColor, top);
  vec3 color = particleColor * light * max(uIntensity, 0.0);
  float edgeFade = smoothstep(0.0, 0.09, depth);
  float alpha = particle * edgeFade * clamp(uIntensity, 0.0, 1.5);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const waveSphereProgram: ShaderProgram = {
  name: 'waveSphere',
  fragmentSource,
};
