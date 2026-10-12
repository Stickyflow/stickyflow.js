import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uBlur;
uniform float uGlow;
uniform float uMotion;
uniform float uDirection;
uniform float uReach;
uniform vec3 uShapeColor;
varying vec2 vUv;

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

vec2 orient(vec2 point, float direction) {
  if (direction < 0.5) return point;
  if (direction < 1.5) return vec2(-point.x, point.y);
  if (direction < 2.5) return vec2(-point.y, point.x);
  return vec2(point.y, -point.x);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float time = uTime * max(uSpeed, 0.0);
  float motion = max(uMotion, 0.0);
  float blur = clamp(uBlur, 0.02, 0.55);

  vec2 q = orient(p, uDirection) - vec2(0.12, 0.0);
  q.x += sin(q.y * 5.0 + time * 0.43) * 0.015 * motion;
  q.y += sin(q.x * 4.0 - time * 0.38) * 0.014 * motion;
  float radius = length(q);
  float reach = clamp(uReach, 0.0, 1.0);
  float left = 1.0 - smoothstep(-0.42, mix(-0.24, 0.46, reach), q.x);
  float upper = smoothstep(-0.05, 0.46, q.y);
  float lower = 1.0 - smoothstep(-0.46, 0.05, q.y);
  float blurSide = left * (0.50 + 0.50 * max(upper, lower));
  float edgeWidth = mix(0.015, blur, blurSide);
  float body = 1.0 - smoothstep(0.49 - edgeWidth, 0.49 + edgeWidth, radius);

  float upperPlume = bell(q.x + 0.33 + sin(time * 0.34) * 0.025 * motion, 0.37 + blur * 0.42);
  upperPlume *= bell(q.y - 0.28, 0.24 + blur * 0.5);
  float lowerPlume = bell(q.x + 0.32 - sin(time * 0.31) * 0.022 * motion, 0.34 + blur * 0.42);
  lowerPlume *= bell(q.y + 0.34, 0.26 + blur * 0.5);
  float plume = (upperPlume * 0.44 + lowerPlume * 0.40) * left * max(uGlow, 0.0);

  vec3 lightColor = mix(uShapeColor, vec3(1.0), 0.24);
  vec3 darkColor = mix(uShapeColor, vec3(0.0), 0.7);
  float vertical = smoothstep(-0.45, 0.44, q.y + sin(q.x * 3.0 + time * 0.29) * 0.035 * motion);
  vec3 orbColor = mix(uShapeColor * 0.82, lightColor, vertical * 0.48);
  float shade = bell(q.x + 0.22, 0.38) * bell(q.y, 0.28);
  orbColor = mix(orbColor, darkColor, shade * 0.43);
  orbColor *= 0.76 + bell(q.x - 0.27, 0.36) * 0.32;

  vec3 plumeColor = mix(uShapeColor, lightColor, smoothstep(-0.26, 0.30, q.y) * 0.35);
  float alpha = body + (1.0 - body) * plume;
  float frameFade = 1.0 - smoothstep(0.85, 1.0, max(abs(p.x), abs(p.y)));
  alpha = clamp(alpha * frameFade * max(uIntensity, 0.0), 0.0, 1.0);
  vec3 premultiplied = orbColor * body + plumeColor * (1.0 - body) * plume;
  gl_FragColor = vec4(clamp(premultiplied * frameFade * max(uIntensity, 0.0), 0.0, 1.0), alpha);
}
`;

export const smearOrbProgram: ShaderProgram = {
  name: 'smearOrb',
  fragmentSource,
  replacesBaseFill: true,
};
