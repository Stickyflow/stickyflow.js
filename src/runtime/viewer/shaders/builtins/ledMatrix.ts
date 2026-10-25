import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uColumns;
uniform float uCellAspect;
uniform float uGap;
uniform float uGlow;
uniform float uDepth;
uniform float uGrain;
uniform float uRotation;
uniform float uRipple;
uniform float uWave;
uniform float uVariation;
uniform float uFade;
uniform float uOriginX;
uniform float uOriginY;
uniform float uSpread;
uniform float uDrift;
uniform float uReaction;
uniform float uPointerSize;
uniform float uHover;
uniform vec2 uPointer;
uniform vec3 uWake[16];
uniform float uCornerRadius;
uniform vec3 uBaseColor;
uniform vec3 uOffColor;
uniform vec3 uColor;
uniform vec3 uHotColor;
varying vec2 vUv;

float boxMask(vec2 uv) {
  vec2 halfBox = uResolution * 0.5;
  float radius = uCornerRadius * min(uResolution.x, uResolution.y);
  vec2 q = abs(uv * uResolution - halfBox) - halfBox + radius;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  return 1.0 - smoothstep(-1.0, 1.0, d);
}

float roundedBox(vec2 point, vec2 halfSize, float radius) {
  vec2 q = abs(point) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float shape = boxMask(vUv);
  if (shape <= 0.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float columns = max(uColumns, 2.0);
  vec2 cellPx = vec2(uResolution.x / columns);
  cellPx.y *= max(uCellAspect, 0.2);
  vec2 rows = uResolution / cellPx;

  // The grid can be turned around the middle of the surface.
  float angle = radians(uRotation);
  vec2 centered = (vUv - 0.5) * uResolution;
  vec2 turned = vec2(cos(angle) * centered.x - sin(angle) * centered.y, sin(angle) * centered.x + cos(angle) * centered.y);
  vec2 turnedUv = turned / uResolution + 0.5;
  vec2 grid = vec2(turnedUv.x, 1.0 - turnedUv.y) * rows;
  vec2 cell = floor(grid);
  vec2 local = (fract(grid) - 0.5) * cellPx;
  vec2 center = (cell + 0.5) / rows;

  // The light of the surface sits at its origin, sways to the sides, and falls off with the spread. A spread of 0 puts it out.
  float spread = max(uSpread, 0.05);
  float lit = smoothstep(0.0, 0.05, uSpread);
  vec2 p = vec2(center.x, 1.0 - center.y);
  vec2 origin = vec2(uOriginX + uDrift * sin(time * 0.7), uOriginY);
  float aspect = uResolution.x / uResolution.y;
  float blob = exp(-pow(length((p - origin) * vec2(1.0, 1.55)) / spread, 2.0) * 5.5) * lit;
  float wave = 0.5 + 0.5 * sin(p.x * 5.0 + time * 1.3 + sin(p.y * 3.0 - time));
  float rise = pow(max(1.0 - abs(p.y - uOriginY) / spread, 0.0), 3.0) * (1.0 - 0.7 * uWave + 0.7 * uWave * wave) * lit;
  float glowLevel = blob * 1.15 + rise * 0.5 + 0.03;

  // Rings that run outward from the light, and a different brightness for every light.
  float rings = 1.0 + uRipple * 0.5 * sin(length((p - origin) * vec2(1.0, 1.55)) * 16.0 - time * 2.5);
  float jitter = 1.0 - uVariation * 0.55 * hash(cell);
  float vignette = 1.0 - clamp(uFade, 0.0, 1.0) * smoothstep(0.3, 0.8, length(p - 0.5) * 1.3);

  // The lights near the pointer glow up while it is over the surface, and the places it has been dim down one after the other.
  float near = exp(-pow(length((p - uPointer) * vec2(aspect, 1.0)) / max(uPointerSize, 0.01), 2.0)) * uHover;
  float wake = 0.0;
  for (int i = 0; i < 16; i++) {
    wake += uWake[i].z * exp(-pow(length((p - uWake[i].xy) * vec2(aspect, 1.0)) / max(uPointerSize * 0.88, 0.01), 2.0));
  }
  float touch = min(near + wake, 1.3) * max(uReaction, 0.0);
  float level = clamp(glowLevel * rings * jitter * vignette * max(uIntensity, 0.0) + touch * 1.1, 0.0, 1.0);

  vec3 tint = mix(uOffColor, uColor, smoothstep(0.0, 0.6, level));
  tint = mix(tint, uHotColor, smoothstep(0.55, 1.0, level));

  vec2 halfSize = cellPx * 0.5 * (1.0 - clamp(uGap, 0.0, 0.8));
  float d = roundedBox(local, halfSize, min(halfSize.x, halfSize.y));
  float body = 1.0 - smoothstep(-0.9, 0.9, d);
  // Depth shades a light like a small bulb: bright in the upper part, darker at the rim.
  float sheen = 1.0 - smoothstep(0.0, halfSize.y * 1.2, abs(local.y + halfSize.y * 0.35));
  float rim = smoothstep(-halfSize.x * 0.7, 0.0, d);
  float depth = clamp(uDepth, 0.0, 1.0);
  vec3 cellColor = tint * (1.0 - 0.4 * depth + 0.4 * depth * sheen) * (1.0 - 0.35 * depth * rim);

  vec3 color = uBaseColor + tint * level * max(uGlow, 0.0) * 0.18;
  color = mix(color, cellColor, body);
  color += (hash(gl_FragCoord.xy) - 0.5) * max(uGrain, 0.0) * 0.2;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), shape);
}
`;

export const ledMatrixProgram: ShaderProgram = {
  name: 'ledMatrix',
  fragmentSource,
  defaultParameters: {
    speed: 0.25,
    intensity: 1,
    columns: 44,
    cellAspect: 1.7,
    gap: 0.3,
    originX: 0.42,
    originY: 0.04,
    spread: 1,
    drift: 0.2,
    depth: 0.5,
    glow: 1,
    grain: 0.2,
    rotation: 0,
    ripple: 0.3,
    wave: 1,
    variation: 0.2,
    fade: 0.3,
    reaction: 1,
    pointerSize: 0.17,
    trail: 1.4,
    cornerRadius: 0.025,
    baseColor: '#050505',
    offColor: '#262626',
    color: '#a3a3a3',
    hotColor: '#ffffff',
  },
};
