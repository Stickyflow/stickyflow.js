import { TONE_CURVE } from './chunks';

// A shader of the 2D drawing on a surface in a Scene, cut to the round corners of its shape, as the drawing cuts its canvas.
// uPlaneCorner holds the radius across and down, as parts of the width and the height.
export function cornerCut(fragmentSource: string): string {
  return `${fragmentSource.replace(/void\s+main\s*\(\s*(void)?\s*\)/, 'void sfShaderMain()')}
uniform vec2 uPlaneCorner;
void main() {
  sfShaderMain();
  vec2 near = min(vUv, 1.0 - vUv);
  if (near.x < uPlaneCorner.x && near.y < uPlaneCorner.y) {
    vec2 into = (uPlaneCorner - near) / uPlaneCorner;
    if (dot(into, into) > 1.0) {
      discard;
    }
  }
}`;
}

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
