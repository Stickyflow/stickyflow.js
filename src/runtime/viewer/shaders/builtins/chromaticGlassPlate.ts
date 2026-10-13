import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform sampler2D uBackdrop;
uniform vec2 uBackdropOrigin;
uniform vec2 uBackdropScale;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uThickness;
uniform float uRefraction;
uniform vec3 uPinkColor;
uniform vec3 uVioletColor;
uniform vec3 uBlueColor;
uniform vec3 uEdgeColor;
varying vec2 vUv;

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * max(uSpeed, 0.0);
  float depth = mix(0.025, 0.105, clamp(uThickness, 0.0, 1.0));
  float radius = 0.79;
  float distance = length(p) - radius;
  float pixel = 2.0 / max(min(uResolution.x, uResolution.y), 1.0);
  float alpha = 1.0 - smoothstep(-pixel, pixel, distance);
  if (alpha < 0.001) discard;

  float edge = smoothstep(0.66, 0.995, length(p) / radius);
  vec2 normal = p / max(length(p), 0.001);
  vec2 opticalWarp = normal * edge * max(uRefraction, 0.0) * 0.12;
  opticalWarp += vec2(sin(p.y * 8.0 + time * 0.35), cos(p.x * 7.0 - time * 0.27)) * 0.002;
  vec2 backdropUv = clamp(uBackdropOrigin + (vUv + opticalWarp) * uBackdropScale, 0.001, 0.999);
  vec3 backdrop = texture2D(uBackdrop, backdropUv).rgb;

  float wave = sin(p.x * 3.1 - time * 0.38) * 0.025;
  float pinkBand = bell(p.y - 0.42 + wave, 0.20);
  float pinkShelf = smoothstep(0.16, 0.30, p.y + wave);
  float whiteCap = smoothstep(0.59, 0.75, p.y + wave) * 0.95;
  vec3 face = backdrop * 0.19 + vec3(0.004, 0.002, 0.011);
  face += uVioletColor * bell(p.y + 0.56, 0.18) * 0.10;
  face += uBlueColor * bell(p.x - 0.49, 0.18) * bell(p.y + 0.22, 0.39) * 0.09;
  face += uPinkColor * pinkBand * pinkShelf * 1.05;
  face += uEdgeColor * whiteCap * 0.88;

  float left = 1.0 - smoothstep(-0.68, -0.34, p.x);
  float right = smoothstep(0.36, 0.68, p.x);
  float upper = smoothstep(0.0, 0.58, p.y);
  float lower = 1.0 - smoothstep(-0.52, -0.04, p.y);
  float rim = bell(distance + 0.004, 0.007);
  float bevel = bell(distance + depth * 0.55, depth * 0.48);
  float innerArc = bell(distance + depth * 1.13, depth * 0.23) * right * lower;
  face += uEdgeColor * rim * (0.61 + 0.35 * upper);
  face += uPinkColor * bevel * (0.18 + 0.58 * left * upper);
  face += uBlueColor * bevel * right * lower * 0.49;
  face += uVioletColor * innerArc * 0.27;
  face += uEdgeColor * bell(distance + depth * 1.3, depth * 0.31) * left * upper * 0.22;
  float movingGlint = bell(p.x + 0.42 - sin(time * 0.47) * 0.075, 0.055);
  face += uEdgeColor * movingGlint * bell(p.y - 0.26, 0.48) * left * 0.15;
  gl_FragColor = vec4(clamp(face * max(uIntensity, 0.0), 0.0, 1.0) * alpha, alpha);
}
`;

export const chromaticGlassPlateProgram: ShaderProgram = {
  name: 'chromaticGlassPlate',
  fragmentSource,
  usesBackdrop: true,
  replacesBaseFill: true,
};
