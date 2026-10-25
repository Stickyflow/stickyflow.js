import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uScale;
uniform float uSharpness;
uniform float uDepth;
uniform float uGlow;
uniform float uGrain;
uniform float uRotation;
uniform float uRipple;
uniform float uWave;
uniform float uVariation;
uniform float uFade;
uniform float uReaction;
uniform float uHover;
uniform vec2 uPointer;
uniform float uCornerRadius;
uniform vec3 uBaseColor;
uniform vec3 uColor;
uniform vec3 uHighlightColor;
varying vec2 vUv;

float boxMask(vec2 uv) {
  vec2 halfBox = uResolution * 0.5;
  float radius = uCornerRadius * min(uResolution.x, uResolution.y);
  vec2 q = abs(uv * uResolution - halfBox) - halfBox + radius;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  return 1.0 - smoothstep(-1.0, 1.0, d);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 turn(vec2 point, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * point.x - s * point.y, s * point.x + c * point.y);
}

void main() {
  float shape = boxMask(vUv);
  if (shape <= 0.0) discard;

  float t = uTime * max(uSpeed, 0.0);
  float aspect = uResolution.x / uResolution.y;
  float angle = radians(uRotation);
  float zoom = max(uScale, 0.2) * 2.0;
  vec2 p = turn((vUv - 0.5) * vec2(aspect, 1.0), angle) * zoom;

  // An irregular, slow bend of the whole cloth, so no two folds are alike.
  p += uVariation * 1.3 * vec2(sin(p.y * 0.37 + 3.1), cos(p.x * 0.41 + 1.7));

  // Bend the plane a few times, then lay a wave over it: the crests of the wave are the folds of the cloth.
  for (int i = 0; i < 3; i++) {
    float k = float(i);
    p += 0.22 * uWave * vec2(sin(p.y * 1.7 + t * 0.6 + k * 1.3), cos(p.x * 1.5 - t * 0.5 + k * 1.9));
  }

  // The cloth lifts where the pointer is over it.
  vec2 touch = turn((uPointer - 0.5) * vec2(aspect, 1.0), angle) * zoom;
  float lift = exp(-pow(length(p - touch) * 0.55, 2.0)) * uHover * max(uReaction, 0.0);

  float phase = p.x * 0.8 + p.y * 2.2 + 1.2 * sin(p.y * 0.9 - t * 0.3) + 0.8 * sin(p.x * 1.3 + t * 0.2) + lift * 2.4;
  phase += uRipple * 0.35 * sin(p.x * 7.0 + p.y * 5.0 + t * 1.1);
  float wave = 0.5 + 0.5 * sin(phase);

  float crest = pow(wave, max(uSharpness, 0.5));
  float body = pow(wave, mix(1.0, 3.2, clamp(uDepth, 0.0, 1.0)));
  float bloom = pow(wave, 1.3) * max(uGlow, 0.0);

  vec3 color = mix(uBaseColor, uColor, body * 0.9);
  color += uHighlightColor * (crest * (0.65 + 0.35 * lift) + bloom * 0.28);
  color *= max(uIntensity, 0.0);
  color *= 1.0 - clamp(uFade, 0.0, 1.0) * smoothstep(0.3, 0.78, length(vUv - 0.5) * 1.35);
  color += (hash(gl_FragCoord.xy) - 0.5) * max(uGrain, 0.0);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), shape);
}
`;

export const silkFoldsProgram: ShaderProgram = {
  name: 'silkFolds',
  fragmentSource,
  defaultParameters: {
    speed: 0.2,
    intensity: 1,
    scale: 2.2,
    sharpness: 5,
    depth: 0.5,
    glow: 0.3,
    grain: 0.08,
    rotation: 0,
    ripple: 0.3,
    wave: 1,
    variation: 0,
    fade: 0.3,
    reaction: 1,
    cornerRadius: 0.02,
    baseColor: '#030303',
    color: '#4d4d4d',
    highlightColor: '#ffffff',
  },
};
