import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uPixelScale;
uniform float uRate;
uniform float uBeat;
uniform float uWindow;
uniform float uThickness;
uniform float uGlow;
uniform float uTrail;
uniform float uAmplitude;
uniform float uLead;
uniform float uHeat;
uniform vec3 uColor;
uniform vec3 uAlert;
varying vec2 vUv;

float hash(float n) {
  return fract(sin(n * 127.1) * 43758.5453123);
}

float bell(float t, float center, float width, float height) {
  float x = (t - center) / width;
  return height * exp(-x * x);
}

// One heartbeat: the P wave, the Q, R and S of the spike, and the T wave. No two beats are quite the same.
float heartbeat(float phase) {
  float number = floor(phase);
  float t = phase - number;
  float strength = 0.92 + 0.16 * hash(number);
  float lead = uLead;
  float r = (lead > 1.5 ? 0.62 : lead > 0.5 ? 0.82 : 1.0) * strength;
  float s = lead > 1.5 ? 0.42 : lead > 0.5 ? 0.3 : 0.22;
  return bell(t, 0.16, 0.038, 0.13)
    - bell(t, 0.28, 0.012, 0.13)
    + bell(t, 0.312, 0.015, r)
    - bell(t, 0.345, 0.015, s)
    + bell(t, 0.54, 0.055, lead > 1.5 ? 0.16 : 0.26)
    + sin(phase * 0.71) * 0.012;
}

float headAt() {
  return fract(uTime * uSpeed / max(uWindow, 0.1));
}

// What the trace shows at a place across the surface: the beat that was there when the head went by.
float beatNow() {
  return uBeat > 0.0 ? uBeat : uTime * uSpeed * uRate / 60.0;
}

float ageAt(float x, float head) {
  return fract(head - x + 1.0);
}

vec2 pointAt(float x, float head, float top, float height) {
  float seconds = ageAt(x, head) * uWindow;
  float value = heartbeat(beatNow() - seconds * uRate / 60.0);
  return vec2(x * uResolution.x, top + (value + 0.45) / 1.55 * height);
}

float toSegment(vec2 p, vec2 a, vec2 b) {
  vec2 side = b - a;
  float along = clamp(dot(p - a, side) / max(dot(side, side), 0.0001), 0.0, 1.0);
  return length(p - a - side * along);
}

void main() {
  float scale = max(uPixelScale, 0.01);
  float head = headAt();
  float height = uResolution.y * clamp(uAmplitude, 0.05, 1.0);
  float top = (uResolution.y - height) * 0.5;
  vec2 p = vUv * uResolution;

  // The nearest part of the line, so that the steep spike is as wide as the flat parts. The places lie on a grid of the surface, so a
  // spike has the same form in every column of pixels. The fine ones find the line, and the coarse ones the light around it.
  float nearest = 1e6;
  float age = 1.0;
  float fine = 1.0 / uResolution.x * max(scale, 1.0);
  float column = floor(vUv.x / fine);
  for (int i = -9; i < 9; i++) {
    float x = (column + float(i)) * fine;
    float ageA = ageAt(x, head);
    if (abs(ageA - ageAt(x + fine, head)) > 0.5) continue;
    float d = toSegment(p, pointAt(x, head, top, height), pointAt(x + fine, head, top, height));
    if (d < nearest) {
      nearest = d;
      age = ageA;
    }
  }
  float coarse = fine * 5.0;
  float block = floor(vUv.x / coarse);
  for (int i = -10; i < 10; i++) {
    float x = (block + float(i)) * coarse;
    float ageA = ageAt(x, head);
    if (abs(ageA - ageAt(x + coarse, head)) > 0.5) continue;
    float d = toSegment(p, pointAt(x, head, top, height), pointAt(x + coarse, head, top, height));
    if (d < nearest) {
      nearest = d;
      age = ageA;
    }
  }

  float fade = pow(clamp(1.0 - age / max(uTrail, 0.01), 0.0, 1.0), 1.4);
  vec3 tint = mix(uColor, uAlert, clamp(uHeat, 0.0, 1.0));
  float line = 1.0 - smoothstep(uThickness * scale * 0.5 - 0.7, uThickness * scale * 0.5 + 0.7, nearest);
  float wide = exp(-nearest / max(uGlow * scale * 0.5, 0.5));
  float tight = exp(-nearest / max(uThickness * scale * 1.2, 0.5));

  // Light gathers at the head, and flares while it writes the spike.
  float young = exp(-age * 18.0);
  float beatPhase = fract(beatNow());
  float flare = exp(-pow((beatPhase - 0.315) / 0.05, 2.0));
  vec3 color = tint * (wide * 0.5 + tight * 0.7) * fade * (1.0 + flare * 0.5);
  color += mix(tint, vec3(1.0), 0.35 + young * 0.65) * line * max(fade, young);

  vec2 tip = pointAt(head - 0.0001, head, top, height);
  float toTip = length(p - tip);
  color += vec3(1.0) * (1.0 - smoothstep(uThickness * scale * 1.2, uThickness * scale * 1.2 + 1.5, toTip));
  color += tint * exp(-toTip / max(uGlow * scale * (0.8 + flare), 0.5)) * (0.9 + flare);

  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0);
  gl_FragColor = vec4(min(color, vec3(1.0)) * min(alpha * 4.0, 1.0), alpha);
}
`;

export const pulseLineProgram: ShaderProgram = {
  name: 'pulseLine',
  fragmentSource,
  defaultParameters: {
    speed: 1,
    rate: 72,
    beat: 0,
    window: 6,
    thickness: 2.6,
    glow: 26,
    trail: 0.92,
    amplitude: 0.9,
    lead: 0,
    heat: 0,
    color: '#ff4d6d',
    alert: '#ffb020',
  },
};
