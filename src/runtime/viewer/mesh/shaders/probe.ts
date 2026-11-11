// What lies under a pixel: which mesh in two channels, and how far away in two more.
export const PROBE_FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
uniform vec3 uEye;
uniform float uRange;
uniform vec2 uId;
out vec4 fragment;
void main() {
  float far = clamp(length(vWorld - uEye) / uRange, 0.0, 1.0) * 65535.0;
  fragment = vec4(uId, floor(far / 256.0) / 255.0, mod(floor(far), 256.0) / 255.0);
}`;
