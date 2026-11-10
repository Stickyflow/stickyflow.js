import { ENVIRONMENT_SHADOW_LOOKUP, SCREEN_OCCLUSION, SHADOW_LOOKUP, TONE_CURVE } from './chunks';

// Only the shadow is drawn, so the page stays visible where there is none.
export const GROUND_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uCenter;
uniform float uFade;
uniform float uStrength;
// How dark a shadow on the page is where the sun is gone entirely.
uniform float uDarkness;
uniform float uGrid;
uniform float uCell;
uniform float uReach;
uniform mat4 uStage;
${SCREEN_OCCLUSION}
out vec4 fragment;
${SHADOW_LOOKUP}
${ENVIRONMENT_SHADOW_LOOKUP}
${TONE_CURVE}
uniform bool uStill;
// The ground itself, when it has a color: drawn first, under what it reflects and the shadows on it.
uniform bool uBasePass;
uniform vec3 uGroundColor;
// Lines one pixel wide at every cell, whatever the distance.
float lines(vec2 at, float cell) {
  vec2 cells = at / cell;
  vec2 width = fwidth(cells);
  vec2 line = abs(fract(cells - 0.5) - 0.5) / width;
  return 1.0 - min(min(line.x, line.y), 1.0);
}
void main() {
  float distance = length(vWorld.xz - uCenter.xz);
  // What runs out before the edges of the Scene never ends in a hard line there.
  vec4 seen = uStage * vec4(vWorld, 1.0);
  vec2 edge = seen.w > 0.0 ? abs(seen.xy / seen.w) : vec2(1.0);
  float inside = (1.0 - smoothstep(0.7, 0.97, edge.x)) * (1.0 - smoothstep(0.7, 0.97, edge.y));
  if (uBasePass) {
    // A ground with a color fills the Scene to its edges, and runs out far away.
    float cover = 1.0 - smoothstep(uReach * 0.45, uReach * 0.95, distance);
    fragment = vec4(uGroundColor * cover, cover);
    return;
  }
  float fade = 1.0 - smoothstep(uFade * 0.6, uFade, distance);
  float shadow = uStrength > 0.0 ? (1.0 - lit()) * uDarkness * fade * uStrength : 0.0;
  // Where something stands on the ground, the ground gets darker toward it.
  shadow = 1.0 - (1.0 - shadow) * (1.0 - (1.0 - screenOcclusion()) * 0.75 * fade);
  // And where it does not see the light of the environment, it is in the shadow of that.
  // It fades out sooner than the shadow of the sun, as lights from many sides would carry it to the edges of the Scene.
  float near = 1.0 - smoothstep(uFade * 0.25, uFade * 0.7, distance);
  // While the picture moves, the one large light takes a part of the light away. In a still picture each light counts for its
  // share of the light from above, so the frames add up to the share of the light a point lacks.
  float weight = uEnvMode == 2 ? uEnvGround * 0.92 : 0.6;
  if (uEnvMode != 0) {
    shadow = 1.0 - (1.0 - shadow) * (1.0 - (1.0 - envShadow()) * weight * near * inside);
  }
  float grid = 0.0;
  if (uGrid > 0.5) {
    vec2 at = vWorld.xz;
    grid = max(lines(at, uCell) * 0.16, lines(at, uCell * 10.0) * 0.32) * (1.0 - smoothstep(uReach * 0.3, uReach, distance));
    grid *= inside;
  }
  // Grey lines under the shadow, with the alpha premultiplied as the page expects.
  float alpha = shadow + grid * (1.0 - shadow);
  vec3 line = uStill ? fromScreen(vec3(0.5)) : vec3(0.5);
  fragment = vec4(line * grid * (1.0 - shadow), alpha);
}`;
