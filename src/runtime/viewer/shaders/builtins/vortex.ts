import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uRings;
uniform float uRingWidth;
uniform float uTwist;
uniform float uArms;
uniform float uWobble;
uniform float uVariation;
uniform float uOffsetX;
uniform float uOffsetY;
uniform float uSquash;
uniform float uEye;
uniform float uAngle;
uniform float uSpread;
uniform float uGlow;
uniform float uGloss;
uniform float uGlossHeight;
uniform float uVignette;
uniform float uGrain;
uniform vec3 uColor;
uniform vec3 uAccent;
uniform vec3 uCool;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float edge = length(p);
  if (edge > 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);

  // The rings are measured from a middle that can lie off the middle of the face, and squeezed to give a little depth.
  vec2 q = p - vec2(uOffsetX, uOffsetY);
  q.y /= max(uSquash, 0.2);
  float radius = length(q);
  float around = atan(q.y, q.x);
  float turn = around / 6.2831853;
  // The twist turns the pattern more the nearer it is to the middle. The rings themselves stay round.
  float angle = around + uTwist * pow(1.0 - radius, 2.0) * 3.0 + time * 0.3 * (1.0 - radius);

  // The phase of the rings: outwards from the middle, drifting inwards with time. Whole arms make the rings join into a spiral, and a
  // whole number leaves no seam. The wobble bends the rings so no two are alike.
  float bend = uWobble * (0.12 * sin(angle * 2.0 + time * 0.6 + radius * 3.0) + 0.06 * sin(angle * 3.0 - time * 0.45));
  float phase = (radius + bend) * uRings - time * 0.25 + floor(uArms + 0.5) * turn;
  float away = abs(fract(phase) - 0.5);
  float width = mix(0.04, 0.32, clamp(uRingWidth, 0.0, 1.0));
  // Every ring has a brightness of its own, so a few stand out and the others are faint.
  float own = mix(1.0, 0.25 + 1.0 * hash(vec2(floor(phase), 3.7)), clamp(uVariation, 0.0, 1.0));
  float ring = exp(-pow(away / width, 2.0)) * own;
  float fineAway = abs(fract(phase * 2.3 + 0.5) - 0.5);
  float fine = exp(-pow(fineAway / (width * 0.8), 2.0)) * 0.5;
  float halo = exp(-pow(away / (width * 3.0), 2.0));

  // Rings fade in from the eye and out towards the rim, and some arcs of a ring are brighter than the rest.
  float envelope = smoothstep(uEye, uEye + 0.3, radius) * (1.0 - smoothstep(0.72, 1.05, edge));
  float arcs = 0.45 + 0.55 * (0.5 + 0.5 * sin(angle * 2.0 + radius * 4.0 + time * 0.5 + 1.0));

  // One side of the face is warm and the other cool, and the spread says how sharp the change is.
  float side = cos(angle - radians(uAngle));
  float warm = mix(0.5, smoothstep(-0.7, 0.9, side), clamp(uSpread, 0.0, 1.0));
  vec3 hue = mix(uCool, uAccent, warm);

  vec3 color = uColor * (0.4 + 0.5 * (1.0 - edge));
  color += hue * (ring * 0.9 + fine * 0.3) * envelope * arcs * uGlow;
  color += hue * halo * envelope * 0.1 * uGlow;
  // The dark eye.
  color *= 0.55 + 0.45 * smoothstep(0.0, uEye + 0.12, radius);

  // A soft light on the glass at the bottom, with a clear lower edge.
  float below = smoothstep(-1.0 + uGlossHeight, -1.0 + uGlossHeight * 0.35, p.y);
  float across = 1.0 - smoothstep(0.45, 1.0, abs(p.x));
  color += mix(uCool, vec3(1.0), 0.5) * below * across * uGloss;

  color *= 1.0 - smoothstep(0.55, 1.0, edge) * uVignette;
  color += (hash(gl_FragCoord.xy + time) - 0.5) * uGrain;

  float alpha = 1.0 - smoothstep(0.985, 1.0, edge);
  gl_FragColor = vec4(clamp(color * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const vortexProgram: ShaderProgram = {
  name: 'vortex',
  fragmentSource,
  defaultParameters: {
    speed: 0.3,
    intensity: 1,
    rings: 12,
    ringWidth: 0.28,
    twist: 0.6,
    arms: 0,
    wobble: 0.12,
    variation: 0.85,
    offsetX: 0,
    offsetY: 0,
    squash: 1,
    eye: 0.3,
    angle: 215,
    spread: 0.6,
    glow: 0.6,
    gloss: 0.45,
    glossHeight: 0.4,
    vignette: 0.6,
    grain: 0.02,
    color: '#05060f',
    accent: '#e0368f',
    cool: '#3d4bff',
  },
};
