import { SCREEN_OCCLUSION, SHADOW_LOOKUP } from './chunks';

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
// Lines one pixel wide at every cell, whatever the distance.
float lines(vec2 at, float cell) {
  vec2 cells = at / cell;
  vec2 width = fwidth(cells);
  vec2 line = abs(fract(cells - 0.5) - 0.5) / width;
  return 1.0 - min(min(line.x, line.y), 1.0);
}
void main() {
  float distance = length(vWorld.xz - uCenter.xz);
  float fade = 1.0 - smoothstep(uFade * 0.6, uFade, distance);
  float shadow = uStrength > 0.0 ? (1.0 - lit()) * uDarkness * fade * uStrength : 0.0;
  // Where something stands on the ground, the ground gets darker toward it.
  shadow = 1.0 - (1.0 - shadow) * (1.0 - (1.0 - screenOcclusion()) * 0.75 * fade);
  float grid = 0.0;
  if (uGrid > 0.5) {
    vec2 at = vWorld.xz;
    grid = max(lines(at, uCell) * 0.16, lines(at, uCell * 10.0) * 0.32) * (1.0 - smoothstep(uReach * 0.3, uReach, distance));
    // It runs out before the edges of the Scene, so it never ends in a hard line.
    vec4 seen = uStage * vec4(vWorld, 1.0);
    vec2 edge = seen.w > 0.0 ? abs(seen.xy / seen.w) : vec2(1.0);
    grid *= (1.0 - smoothstep(0.7, 0.97, edge.x)) * (1.0 - smoothstep(0.7, 0.97, edge.y));
  }
  // Grey lines under the shadow, with the alpha premultiplied as the page expects.
  float alpha = shadow + grid * (1.0 - shadow);
  vec3 color = vec3(0.5) * grid * (1.0 - shadow);
  fragment = vec4(color, alpha);
}`;
