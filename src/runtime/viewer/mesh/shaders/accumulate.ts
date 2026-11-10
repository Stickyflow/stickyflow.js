import { TONE_CURVE } from './chunks';

// A frame of a still picture, added to the sum of the frames before it.
export const ADD_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uFrame;
out vec4 fragment;
void main() {
  fragment = texture(uFrame, vUv);
}`;

// The sum of the frames, shown as their mean: light, turned into what a screen shows.
export const SHOW_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSum;
uniform float uCount;
out vec4 fragment;
${TONE_CURVE}
void main() {
  vec4 mean = texture(uSum, vUv) / uCount;
  if (mean.a <= 0.0) {
    fragment = vec4(0.0);
    return;
  }
  float alpha = min(mean.a, 1.0);
  fragment = vec4(toScreen(mean.rgb / mean.a) * alpha, alpha);
}`;
