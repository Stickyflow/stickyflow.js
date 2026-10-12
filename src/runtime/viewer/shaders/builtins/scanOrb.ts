import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uAperture;
uniform float uGlow;
uniform float uGrain;
uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform vec3 uHotColor;
uniform vec3 uCoolColor;
varying vec2 vUv;

float hash21(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float bell(float value, float width) {
  return exp(-pow(value / max(width, 0.001), 2.0));
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float radius = length(p);
  if (radius >= 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float depth = sqrt(max(1.0 - radius * radius, 0.0));
  float aperture = clamp(uAperture, 0.35, 1.4);
  vec2 fluidOffset = vec2(
    sin(p.y * 5.0 + time * 0.72),
    cos(p.x * 4.2 - time * 0.61)
  ) * 0.018;
  vec2 cavityPoint = vec2(
    (p.x + fluidOffset.x) / (0.54 * aperture),
    (p.y + 0.59 + fluidOffset.y) / (0.255 * aperture)
  );
  float cavityAngle = atan(cavityPoint.y, cavityPoint.x);
  float breathing = sin(time * 0.62) * 0.025;
  float liquidEdge = sin(cavityAngle * 3.0 - time * 0.83) * 0.035;
  liquidEdge += sin(cavityAngle * 5.0 + time * 0.47) * 0.014;
  float cavityDistance = length(cavityPoint) + liquidEdge;
  float cavity = 1.0 - smoothstep(0.78 + breathing, 1.02 + breathing, cavityDistance);
  float rim = bell(cavityDistance - 1.0 - breathing, 0.17);
  float outerRim = bell(cavityDistance - 1.04 - breathing, 0.31);
  float lowerCool = rim * smoothstep(-0.84, -0.5, -p.y);
  float flowPhase = cavityAngle * 2.0 - time * 0.78;
  float hotFlow = 0.66 + 0.34 * sin(flowPhase);
  float coolFlow = 0.62 + 0.38 * sin(flowPhase + 3.1415926);

  float verticalShade = smoothstep(-0.92, 0.8, p.y);
  vec3 sphere = mix(uShadowColor, uBaseColor, 0.38 + verticalShade * 0.5);
  sphere *= 0.72 + depth * 0.34;
  sphere += uBaseColor * bell(p.y - 0.35, 0.46) * 0.12;

  float glowStrength = max(uGlow, 0.0);
  vec3 color = sphere;
  color = mix(color, uShadowColor * 0.16, cavity * 0.98);
  color += uHotColor * rim * glowStrength * (0.4 + cavity * 0.25) * hotFlow;
  color += uHotColor * outerRim * glowStrength * 0.14 * hotFlow;
  color += uCoolColor * lowerCool * glowStrength * 0.7 * coolFlow;

  float fresnel = pow(1.0 - depth, 2.5);
  color += mix(uCoolColor, vec3(1.0), 0.45) * fresnel * 0.16;
  float grain = (hash21(gl_FragCoord.xy) - 0.5) * max(uGrain, 0.0);
  color += grain;

  float edgeWidth = 2.2 / max(min(uResolution.x, uResolution.y), 1.0);
  float edgeAlpha = 1.0 - smoothstep(1.0 - edgeWidth, 1.0, radius);
  float alpha = edgeAlpha * max(uIntensity, 0.0);
  vec3 finalColor = clamp(color * max(uIntensity, 0.0), 0.0, 1.0) * edgeAlpha;

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
}
`;

export const scanOrbProgram: ShaderProgram = {
  name: 'scanOrb',
  fragmentSource,
};
