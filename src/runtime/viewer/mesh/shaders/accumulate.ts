// A frame of a still picture, added to the sum of the frames before it.
export const ADD_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uFrame;
out vec4 fragment;
void main() {
  fragment = texture(uFrame, vUv);
}`;

// The sum of the frames, shown as their mean.
export const SHOW_FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSum;
uniform float uCount;
out vec4 fragment;
void main() {
  fragment = texture(uSum, vUv) / uCount;
}`;
