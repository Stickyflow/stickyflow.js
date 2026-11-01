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
