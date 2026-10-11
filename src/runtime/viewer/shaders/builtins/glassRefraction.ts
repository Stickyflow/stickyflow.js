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
uniform float uIor;
uniform float uRefraction;
uniform float uRoughness;
uniform float uChromaticAberration;
uniform float uEdgeLight;
uniform vec3 uTint;
uniform vec3 uEdgeColor;
varying vec2 vUv;

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float radius = length(p);
  if (radius >= 1.0) discard;

  float time = uTime * max(uSpeed, 0.0);
  float roughness = max(uRoughness, 0.0);
  vec2 flow = vec2(
    smoothNoise(p * 2.4 + vec2(time * 0.12, -time * 0.08)),
    smoothNoise(p * 2.8 + vec2(-time * 0.09, time * 0.11))
  ) - 0.5;
  float sphereDepth = sqrt(max(1.0 - radius * radius, 0.0));
  vec2 glassMotion = vec2(
    sin(p.y * 3.2 + time * 1.15),
    cos(p.x * 2.8 - time * 0.92)
  ) * 0.014;
  vec3 surfaceNormal = normalize(vec3(p + glassMotion + flow * roughness * 0.22, sphereDepth));
  float eta = 1.0 / max(uIor, 1.001);
  vec3 refracted = refract(vec3(0.0, 0.0, -1.0), surfaceNormal, eta);
  vec2 distortion = refracted.xy * max(uRefraction, 0.0);
  distortion += flow * (0.008 + roughness * 0.025);
  distortion += vec2(
    sin(time * 0.82 + p.y * 1.7),
    cos(time * 0.68 + p.x * 1.5)
  ) * 0.009;

  vec2 backdropUv = uBackdropOrigin + vUv * uBackdropScale;
  vec2 refractedUv = clamp(backdropUv + distortion * uBackdropScale, 0.001, 0.999);
  float chroma = max(uChromaticAberration, 0.0) * 0.012;
  vec2 chromaOffset = normalize(distortion + vec2(0.0001)) * chroma * uBackdropScale;
  float red = texture2D(uBackdrop, clamp(refractedUv + chromaOffset, 0.001, 0.999)).r;
  float green = texture2D(uBackdrop, refractedUv).g;
  float blue = texture2D(uBackdrop, clamp(refractedUv - chromaOffset, 0.001, 0.999)).b;
  vec3 sharpBackdrop = vec3(red, green, blue);
  vec2 texel = uBackdropScale / max(uResolution, vec2(1.0));
  vec2 blurOffset = texel * (0.65 + roughness * 5.0);
  vec3 blurredBackdrop = texture2D(uBackdrop, refractedUv + vec2(blurOffset.x, 0.0)).rgb;
  blurredBackdrop += texture2D(uBackdrop, refractedUv - vec2(blurOffset.x, 0.0)).rgb;
  blurredBackdrop += texture2D(uBackdrop, refractedUv + vec2(0.0, blurOffset.y)).rgb;
  blurredBackdrop += texture2D(uBackdrop, refractedUv - vec2(0.0, blurOffset.y)).rgb;
  blurredBackdrop *= 0.25;
  vec3 backdrop = mix(sharpBackdrop, blurredBackdrop, clamp(roughness * 1.15, 0.0, 1.0));

  float fresnel = pow(1.0 - sphereDepth, 2.35);
  float innerRim = smoothstep(0.72, 0.995, radius);
  vec3 movingLight = normalize(vec3(
    -0.4 + sin(time * 1.05) * 0.32,
    0.58 + cos(time * 0.88) * 0.2,
    0.62
  ));
  float highlight = pow(max(dot(movingLight, surfaceNormal), 0.0), 28.0);
  float hotSpot = pow(max(dot(movingLight, surfaceNormal), 0.0), 92.0);
  float angle = atan(p.y, p.x);
  float movingRim = 0.68 + 0.32 * sin(angle * 2.0 - time * 1.05);
  float rimGlint = pow(max(cos(angle - time * 0.72 - 2.35), 0.0), 20.0) * innerRim;
  vec3 color = mix(backdrop, backdrop * uTint, 0.025 + fresnel * 0.09);
  color += uEdgeColor * innerRim * max(uEdgeLight, 0.0) * (0.1 + fresnel * 0.5) * movingRim;
  color += uEdgeColor * rimGlint * max(uEdgeLight, 0.0) * 0.72;
  color += uEdgeColor * highlight * 0.5;
  color += vec3(1.0) * hotSpot * 0.58;
  color += vec3(1.0) * fresnel * 0.05;
  color *= max(uIntensity, 0.0);

  float edgeWidth = 2.2 / max(min(uResolution.x, uResolution.y), 1.0);
  float edgeAlpha = 1.0 - smoothstep(1.0 - edgeWidth, 1.0, radius);
  vec3 finalColor = clamp(color, 0.0, 1.0) * edgeAlpha;
  gl_FragColor = vec4(finalColor, edgeAlpha);
}
`;

export const glassRefractionProgram: ShaderProgram = {
  name: 'glassRefraction',
  fragmentSource,
  usesBackdrop: true,
};
