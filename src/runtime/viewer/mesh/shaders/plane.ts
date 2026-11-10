export const PLANE_VERTEX = `attribute vec2 aPosition;
uniform mat4 uMvp;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = uMvp * vec4(aPosition, 0.0, 1.0);
}`;

export const PLANE_FRAGMENT = `precision highp float;
uniform sampler2D uPicture;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uPicture, vUv);
  if (color.a < 0.004) {
    discard;
  }
  gl_FragColor = color;
}`;
