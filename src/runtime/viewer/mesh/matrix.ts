import type { Vec3 } from '../../../model/mesh';

// Column-major, as WebGL reads them.
export type Mat4 = Float32Array;

export function identity(): Mat4 {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[column * 4 + k];
      }
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

export function fromQuaternionTrs(
  translation: readonly number[],
  quaternion: readonly number[],
  scale: readonly number[],
): Mat4 {
  const [x, y, z, w] = quaternion;
  const [sx, sy, sz] = scale;
  return new Float32Array([
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ]);
}

export function modelMatrix(position: Vec3, rotationDegrees: Vec3, scale: Vec3): Mat4 {
  const half = rotationDegrees.map(degrees => (degrees * Math.PI) / 360);
  const [sx, sy, sz] = half.map(Math.sin);
  const [cx, cy, cz] = half.map(Math.cos);
  // The rotation about x comes first, then y, then z.
  const quaternion = [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ];
  return fromQuaternionTrs(position, quaternion, scale);
}

export function perspective(fovRadians: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovRadians / 2);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    -1,
    0,
    0,
    (2 * far * near) / (near - far),
    0,
  ]);
}

const subtract = (a: readonly number[], b: readonly number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a: readonly number[], b: readonly number[]): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function normalize(v: readonly number[]): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

export function orthographic(half: number, near: number, far: number): Mat4 {
  return new Float32Array([
    1 / half,
    0,
    0,
    0,
    0,
    1 / half,
    0,
    0,
    0,
    0,
    2 / (near - far),
    0,
    0,
    0,
    (far + near) / (near - far),
    1,
  ]);
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
  const z = normalize(subtract(eye, target));
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -dot(x, eye),
    -dot(y, eye),
    -dot(z, eye),
    1,
  ]);
}

export function transformPoint(m: Mat4, p: ArrayLike<number>, offset = 0): Vec3 {
  const [x, y, z] = [p[offset], p[offset + 1], p[offset + 2]];
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// The inverse transpose of the upper part of a matrix, which keeps normals upright under a scale that is not even.
export function normalMatrix(m: Mat4): Float32Array {
  const [a, b, c, d, e, f, g, h, i] = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const [k00, k01, k02] = [e * i - f * h, f * g - d * i, d * h - e * g];
  const determinant = a * k00 + b * k01 + c * k02 || 1;
  return new Float32Array([
    k00 / determinant,
    k01 / determinant,
    k02 / determinant,
    (c * h - b * i) / determinant,
    (a * i - c * g) / determinant,
    (b * g - a * h) / determinant,
    (b * f - c * e) / determinant,
    (c * d - a * f) / determinant,
    (a * e - b * d) / determinant,
  ]);
}

// Scales and moves x and y, as for a part of a square or the part of a picture that is shown.
export function windowMatrix(scaleX: number, scaleY: number, moveX: number, moveY: number): Mat4 {
  const m = identity();
  m[0] = scaleX;
  m[5] = scaleY;
  m[12] = moveX;
  m[13] = moveY;
  return m;
}

// The matrix that undoes another, by cofactors. A matrix that cannot be undone gives the identity.
export function invert(m: Mat4): Mat4 {
  const out = new Float32Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  const determinant = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!determinant) {
    return identity();
  }
  const d = 1 / determinant;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
  return out;
}
