import type { ShaderProgram } from '../types';

const fragmentSource = `
precision highp float;

uniform float uTime;
uniform float uSpeed;
uniform float uIntensity;
uniform float uEmission;
uniform float uReception;
uniform float uEmitterFill;
uniform float uGrain;
uniform float uGrainScale;
uniform float uCornerRadius;
uniform float uBorderWidth;
uniform float uGlowRadius;
uniform float uSurfacePadding;
uniform float uLightX;
uniform float uLightY;
uniform float uLightStrength;
uniform float uPixelScale;
uniform vec2 uResolution;
uniform vec3 uShapeColor;
uniform vec3 uBaseColor;
uniform vec3 uEdgeColor;
uniform vec3 uLightColor;
varying vec2 vUv;

float roundedBoxDistance(vec2 point, vec2 halfSize, float radius) {
  vec2 offset = abs(point) - halfSize + radius;
  return min(max(offset.x, offset.y), 0.0) + length(max(offset, 0.0)) - radius;
}

float random(vec2 point) {
  return fract(sin(dot(mod(point, 289.0), vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 pixel = vUv * uResolution;
  float pixelScale = max(uPixelScale, 0.0001);
  float padding = clamp(uSurfacePadding * pixelScale, 0.0, min(uResolution.x, uResolution.y) * 0.45);
  vec2 panelHalfSize = max(vec2(1.0), uResolution * 0.5 - padding);
  vec2 panelPoint = pixel - uResolution * 0.5;
  float radius = min(max(uCornerRadius * pixelScale, 0.0), min(panelHalfSize.x, panelHalfSize.y));
  float distance = roundedBoxDistance(panelPoint, panelHalfSize, radius);
  float body = 1.0 - smoothstep(-1.25, 0.75, distance);
  float borderWidth = max(uBorderWidth * pixelScale, 0.5);
  float edge = exp(-pow(distance / borderWidth, 2.0));
  float innerEdge = exp(-pow((distance + borderWidth * 2.25) / (borderWidth * 2.2), 2.0)) * body;

  vec2 lightPosition = vec2(uLightX, 1.0 - uLightY) * uResolution;
  float lightDistance = length(pixel - lightPosition);
  float lightRadius = max(uGlowRadius * pixelScale, 1.0);
  float receivedLight = exp(-pow(lightDistance / lightRadius, 2.0));
  receivedLight *= max(uReception, 0.0) * max(uLightStrength, 0.0);

  float speed = max(uSpeed, 0.0);
  float breath = 0.88 + 0.12 * sin(uTime * speed * 6.2831853);
  float emittedLight = max(uEmission, 0.0) * breath;
  float outsideFalloff = exp(-max(distance, 0.0) / max(lightRadius * 0.22, 1.0));
  float outsideGlow = outsideFalloff * (emittedLight * 1.35 + receivedLight * 0.9);
  float frameDistance = min(min(pixel.x, uResolution.x - pixel.x), min(pixel.y, uResolution.y - pixel.y));
  float frameFade = smoothstep(0.0, max(padding * 0.65, 1.0), frameDistance);
  outsideGlow *= frameFade;

  vec3 baseColor = dot(uBaseColor, uBaseColor) > 0.0 ? uBaseColor : uShapeColor;
  vec3 edgeColor = dot(uEdgeColor, uEdgeColor) > 0.0 ? uEdgeColor : vec3(0.22, 0.72, 1.0);
  vec3 lightColor = dot(uLightColor, uLightColor) > 0.0 ? uLightColor : edgeColor;
  vec3 color = baseColor * (0.82 + receivedLight * 0.42);

  // Emission lights the material itself instead of leaving a dark cutout behind.
  // A soft centre bias keeps the fill dimensional while the edge remains crisp.
  vec2 normalizedPoint = panelPoint / max(panelHalfSize, vec2(1.0));
  float centreLight = 1.0 - smoothstep(0.05, 1.25, length(normalizedPoint));
  float fillLight = clamp(emittedLight * max(uEmitterFill, 0.0), 0.0, 1.0) * body;
  vec3 illuminatedFill = mix(edgeColor, lightColor, 0.62 + centreLight * 0.28);
  color = mix(color, illuminatedFill * (0.72 + centreLight * 0.62), fillLight);

  // Fine object-space luminance grain. It is intentionally emission-gated so
  // receiver panels stay clean and the texture stays fixed on the active tile.
  float grainScale = max(uGrainScale * pixelScale, 0.75);
  vec2 grainCell = floor(pixel / grainScale);
  float grainValue = random(grainCell);
  float grainLight = (grainValue - 0.36) * max(uGrain, 0.0) * fillLight;
  color += lightColor * grainLight * (0.5 + centreLight * 0.75);

  color += edgeColor * edge * (0.42 + emittedLight * 1.7);
  color += lightColor * edge * receivedLight * 2.5;
  color += lightColor * innerEdge * receivedLight * 1.25;

  float intensity = max(uIntensity, 0.0);
  float halo = outsideGlow * (1.0 - body) * 0.9 * intensity;
  float alpha = body + halo;
  if (alpha < 0.002) discard;

  vec3 haloColor = mix(edgeColor, lightColor, clamp(receivedLight * 1.5, 0.0, 1.0));
  vec3 premultiplied = color * body * intensity + haloColor * halo;
  gl_FragColor = vec4(clamp(premultiplied, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

export const reactivePanelProgram: ShaderProgram = {
  name: 'reactivePanel',
  fragmentSource,
  defaultParameters: {
    intensity: 0.5,
    speed: 0.18,
    emission: 0,
    reception: 0.85,
    emitterFill: 0,
    grain: 0,
    grainScale: 1.5,
    cornerRadius: 18,
    borderWidth: 2,
    glowRadius: 90,
    lightX: 0.5,
    lightY: 0.5,
    lightStrength: 0,
    baseColor: '#09101c',
    edgeColor: '#33b8ff',
    lightColor: '#59d1ff',
  },
  replacesBaseFill: true,
};
