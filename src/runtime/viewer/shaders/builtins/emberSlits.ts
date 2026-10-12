import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSlitCount;
uniform float uOrientation;
uniform bool uHole;
uniform float uHoleSize;
uniform float uGlow;
uniform float uMotion;
uniform vec3 uHotColor;
uniform vec3 uCoreColor;
uniform vec3 uHighlightColor;
varying vec2 vUv;

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * max(uSpeed, 0.0);
  float motion = max(uMotion, 0.0);
  float radius = length(p);

  float wave = sin(p.y * 6.4 - time * 0.55) * 0.018 * motion;
  wave += sin(p.x * 5.1 + time * 0.33) * 0.012 * motion;
  float ringRadius = length(p + vec2(wave, 0.0));
  float holeSize = clamp(uHoleSize, 0.0, 0.72);
  float ring = uHole ? smoothstep(holeSize - 0.08, holeSize + 0.08, ringRadius) : 1.0;
  ring *= 1.0 - smoothstep(0.65, 0.83, ringRadius);
  float ringCore = bell(ringRadius - 0.56, 0.19);

  float count = clamp(uSlitCount, 12.0, 90.0);
  vec2 slitPoint = uOrientation < 0.5 ? p : vec2(p.y, p.x);
  float phase = slitPoint.x * count * 3.14159265;
  phase += sin(slitPoint.y * 3.6 - time * 0.58) * 0.23 * motion;
  phase += time * 0.17 * motion;
  float bars = pow(0.5 + 0.5 * cos(phase), 1.9);
  float slit = 0.12 + 0.88 * bars;
  float sideFade = 1.0 - smoothstep(0.67, 0.91, abs(p.x));

  float upperLight = bell(p.y - 0.45, 0.21);
  float lowerLight = bell(p.y + 0.48, 0.24);
  vec3 heat = mix(uHotColor, uCoreColor, smoothstep(-0.57, 0.55, p.y));
  heat = mix(heat, uHighlightColor, upperLight * 0.45 + lowerLight * 0.28);
  float molten = ring * slit * sideFade;
  vec3 color = heat * molten * (0.64 + ringCore * 0.68);

  float verticalTrail = bell(max(ringRadius - 0.69, 0.0), 0.24);
  verticalTrail *= smoothstep(0.25, 0.75, abs(p.y));
  verticalTrail *= slit * sideFade;
  float bloom = bell(ringRadius - 0.57, 0.29) * ring;
  float glow = max(uGlow, 0.0);
  float glowMask = (verticalTrail * 0.25 + bloom * 0.17) * glow;
  color += heat * glowMask;

  float frameFade = 1.0 - smoothstep(0.89, 1.0, max(abs(p.x), abs(p.y)));
  float alpha = clamp((molten * 0.92 + glowMask) * frameFade * max(uIntensity, 0.0), 0.0, 1.0);
  gl_FragColor = vec4(clamp(color * max(uIntensity, 0.0), 0.0, 1.0) * alpha, alpha);
}
`;

export const emberSlitsProgram: ShaderProgram = {
  name: 'emberSlits',
  fragmentSource,
};
