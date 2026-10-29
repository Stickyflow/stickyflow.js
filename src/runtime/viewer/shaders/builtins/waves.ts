import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uLayers;
uniform float uLevel;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uTilt;
uniform float uSoftness;
uniform float uEdge;
uniform float uShade;
uniform float uGlow;
uniform float uVignette;
uniform float uGrain;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uCool;
uniform vec3 uHighlight;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float edge = length(p);
  if (edge > 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float angle = radians(uTilt);
  vec2 q = vec2(cos(angle) * p.x - sin(angle) * p.y, sin(angle) * p.x + cos(angle) * p.y);

  // The ground, a little lighter in the middle.
  vec3 color = uColor * (0.6 + 0.4 * (1.0 - edge));
  float count = clamp(uLayers, 1.0, 8.0);
  float soft = max(uSoftness, 0.004);

  // The layers lie one behind the other, the farthest first. Each one fills the area under a wave line, and the line itself catches the light.
  for (int i = 0; i < 8; i++) {
    float index = float(i);
    if (index >= count) break;
    float depth = index / max(count - 1.0, 1.0);
    float base = uLevel + mix(0.5, -0.55, depth);
    float swing = uAmplitude * (0.55 + 0.45 * depth);
    float line = base
      + swing * 0.6 * sin(q.x * uFrequency * (1.0 + 0.3 * index) + index * 1.7 + time * (0.4 + 0.08 * index))
      + swing * 0.4 * sin(q.x * uFrequency * 2.1 - index * 2.3 - time * 0.3);
    float under = smoothstep(soft, -soft, q.y - line);
    // A layer is lit at its crest and falls into shadow below it, so it reads as a fold of cloth and not as a flat band.
    float sink = clamp((line - q.y) / 0.35, 0.0, 1.0);
    vec3 layer = mix(uAccent, uCool, depth) * mix(1.15, 1.0 - 0.6 * uShade, sink);
    color = mix(color, layer, under * (0.5 + 0.2 * depth));
    float crest = exp(-pow((q.y - line) / (0.012 + soft * 0.5), 2.0));
    color += uHighlight * crest * uEdge * (0.35 + 0.65 * (1.0 - depth));
  }

  // A soft light over the surface, and a dark edge.
  color += uHighlight * uGlow * 0.18 * exp(-pow((q.y - 0.55) / 0.45, 2.0));
  color *= 1.0 - smoothstep(0.6, 1.0, edge) * uVignette;
  color += (hash(gl_FragCoord.xy + time) - 0.5) * uGrain;

  float alpha = 1.0 - smoothstep(0.985, 1.0, edge);
  gl_FragColor = vec4(clamp(color * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const wavesProgram: ShaderProgram = {
  name: 'waves',
  fragmentSource,
  defaultParameters: {
    speed: 0.25,
    intensity: 1,
    layers: 5,
    level: 0,
    amplitude: 0.14,
    frequency: 3.2,
    tilt: -12,
    softness: 0.05,
    edge: 0.5,
    shade: 0.6,
    glow: 0.5,
    vignette: 0.4,
    grain: 0.02,
    color: '#0e0828',
    accent: '#6b3fd4',
    cool: '#2f5fe0',
    highlight: '#b9a0ff',
  },
};
