import { TONE_CURVE } from './chunks';

export const PLANE_VERTEX = `attribute vec2 aPosition;
uniform mat4 uMvp;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = uMvp * vec4(aPosition, 0.0, 1.0);
}`;

// In a frame of a still picture its colors are put among light, so they come out as they went in.
export const PLANE_FRAGMENT = `precision highp float;
uniform sampler2D uPicture;
uniform bool uStill;
varying vec2 vUv;
${TONE_CURVE}
void main() {
  vec4 color = texture2D(uPicture, vUv);
  if (color.a < 0.004) {
    discard;
  }
  gl_FragColor = uStill ? vec4(fromScreen(color.rgb / color.a) * color.a, color.a) : color;
}`;
