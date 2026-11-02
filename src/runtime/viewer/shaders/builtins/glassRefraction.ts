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
uniform float uPanel;
uniform float uDistortion;
uniform float uCornerRadius;
uniform float uPixelScale;
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

float roundedBox(vec2 p, vec2 half_, float radius) {
  vec2 d = abs(p) - half_ + radius;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
}

// A flat pane, as on a rectangle: what lies behind it is frosted, and it only bends at its edge.
void panel() {
  float scale = max(uPixelScale, 0.01);
  vec2 half_ = uResolution * 0.5;
  vec2 at = vUv * uResolution - half_;
  float radius = min(uCornerRadius * scale, min(half_.x, half_.y));
  float box = roundedBox(at, half_, radius);
  float alpha = 1.0 - smoothstep(-1.0, 0.0, box);
  vec2 normal = normalize(vec2(
    roundedBox(at + vec2(1.0, 0.0), half_, radius) - roundedBox(at - vec2(1.0, 0.0), half_, radius),
    roundedBox(at + vec2(0.0, 1.0), half_, radius) - roundedBox(at - vec2(0.0, 1.0), half_, radius)
  ) + vec2(0.0001));
  float edge = 1.0 - smoothstep(0.0, 26.0 * scale, -box);

  vec2 bend = -normal * edge * edge * max(uRefraction, 0.0) * 60.0 * scale / uResolution;
  // The glass is uneven, like poured glass, so what lies behind it swims and is torn apart.
  vec2 world = vUv * uResolution / scale;
  float flow = uTime * max(uSpeed, 0.0) * 0.15;
  vec2 uneven = vec2(
    smoothNoise(world * 0.006 + vec2(flow, 3.0)) + 0.5 * smoothNoise(world * 0.017 + vec2(1.0, flow)),
    smoothNoise(world * 0.006 + vec2(7.0, -flow)) + 0.5 * smoothNoise(world * 0.017 + vec2(-flow, 5.0))
  ) - 0.75;
  bend += uneven * max(uDistortion, 0.0) * 260.0 * scale / uResolution;
  vec2 chroma = normal * edge * max(uChromaticAberration, 0.0) * 8.0 * scale / uResolution;
  float spread = max(uRoughness, 0.0) * 70.0 * scale;
  float turn = hash(vUv * uResolution) * 6.2831853;
  vec3 backdrop = vec3(0.0);
  for (int i = 0; i < 24; i++) {
    float n = float(i) + 0.5;
    float angle = n * 2.3999632 + turn;
    vec2 v = vUv + bend + vec2(cos(angle), sin(angle)) * sqrt(n / 24.0) * spread / uResolution;
    backdrop.r += texture2D(uBackdrop, uBackdropOrigin + (v + chroma) * uBackdropScale).r;
    backdrop.g += texture2D(uBackdrop, uBackdropOrigin + v * uBackdropScale).g;
    backdrop.b += texture2D(uBackdrop, uBackdropOrigin + (v - chroma) * uBackdropScale).b;
  }
  backdrop /= 24.0;

  vec3 color = mix(backdrop * 0.86, uTint, 0.05 + 0.05 * vUv.y);
  float light = 0.35 + 0.65 * clamp(dot(normal, normalize(vec2(-0.6, 0.8))) * 0.5 + 0.5, 0.0, 1.0);
  float line = 1.0 - smoothstep(0.0, 1.5 * scale, -box);
  color += uEdgeColor * max(uEdgeLight, 0.0) * (line * light * 0.55 + edge * edge * light * 0.09);
  color *= max(uIntensity, 0.0);
  color += (hash(vUv * uResolution + 3.1) - 0.5) * 0.018;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha);
}

void main() {
  if (uPanel > 0.5) {
    panel();
    return;
  }
  float time = uTime * max(uSpeed, 0.0);
  vec2 sphereOffset = vec2(
    sin(time * 0.72) * 0.04,
    cos(time * 0.56) * 0.026
  );
  float sphereScale = 0.95;
  vec2 p = (vUv * 2.0 - 1.0 - sphereOffset) / sphereScale;
  float radius = length(p);
  if (radius >= 1.0) discard;

  float roughness = max(uRoughness, 0.0);
  vec2 flow = vec2(
    smoothNoise(p * 2.4 + vec2(0.7, -0.3)),
    smoothNoise(p * 2.8 + vec2(-0.4, 0.8))
  ) - 0.5;
  float sphereDepth = sqrt(max(1.0 - radius * radius, 0.0));
  vec2 glassMotion = vec2(
    sin(p.y * 3.2 + 0.6),
    cos(p.x * 2.8 - 0.35)
  ) * 0.014;
  vec3 surfaceNormal = normalize(vec3(p + glassMotion + flow * roughness * 0.22, sphereDepth));
  float eta = 1.0 / max(uIor, 1.001);
  vec3 refracted = refract(vec3(0.0, 0.0, -1.0), surfaceNormal, eta);
  vec2 distortion = refracted.xy * max(uRefraction, 0.0);
  distortion += flow * (0.008 + roughness * 0.025);

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
  vec2 fixedLightPosition = vec2(-0.46, 0.7);
  vec2 surfacePosition = sphereOffset + p * sphereScale * 0.22;
  vec3 lightDirection = normalize(vec3(fixedLightPosition - surfacePosition, 0.62));
  float highlight = pow(max(dot(lightDirection, surfaceNormal), 0.0), 28.0);
  float hotSpot = pow(max(dot(lightDirection, surfaceNormal), 0.0), 92.0);
  float angle = atan(p.y, p.x);
  float lightAngle = atan(lightDirection.y, lightDirection.x);
  float movingRim = 0.68 + 0.32 * sin(angle * 2.0 - lightAngle);
  float rimGlint = pow(max(cos(angle - lightAngle), 0.0), 20.0) * innerRim;
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
