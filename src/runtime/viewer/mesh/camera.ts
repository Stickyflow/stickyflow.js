import type { Vec3 } from '../../../model/mesh';
import { cross, dot, lookAt, type Mat4, multiply, normalize, perspective, windowMatrix } from './matrix';

export const FOV = (32 * Math.PI) / 180;
const WORLD_UP: Vec3 = [0, 1, 0];
const FRAME_MARGIN = 1.04;
const LOWEST_FOLLOWED = 0.5;

export interface Box {
  min: Vec3;
  max: Vec3;
}

export interface MeshFrame {
  center: Vec3;
  radius: number;
  distance: number;
}

// The part of the stage that is drawn, from -1 to 1.
export type StageWindow = readonly [left: number, bottom: number, right: number, top: number];

const WHOLE_STAGE: StageWindow = [-1, -1, 1, 1];

export interface Camera {
  eye: Vec3;
  // What is drawn: only the part of the stage in `window`, which fills the canvas.
  viewProjection: Mat4;
  // The whole stage, from -1 to 1.
  stage: Mat4;
  window: StageWindow;
  range: number;
  back: Vec3;
  right: Vec3;
  up: Vec3;
  aspect: number;
}

export interface PlaneHit {
  distance: number;
  // From 0 to 1 and from the top left, also beyond the edges of the surface.
  x: number;
  y: number;
}

export function emptyBox(): Box {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

export function growBox(box: Box, point: readonly number[]): void {
  for (let axis = 0; axis < 3; axis++) {
    box.min[axis] = Math.min(box.min[axis], point[axis]);
    box.max[axis] = Math.max(box.max[axis], point[axis]);
  }
}

export const boxCenter = ({ min, max }: Box): Vec3 => [
  (min[0] + max[0]) / 2,
  (min[1] + max[1]) / 2,
  (min[2] + max[2]) / 2,
];

export const boxDiagonal = ({ min, max }: Box): number => Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);

export function boxCorner({ min, max }: Box, index: number): Vec3 {
  return [index & 1 ? max[0] : min[0], index & 2 ? max[1] : min[1], index & 4 ? max[2] : min[2]];
}

function eyeDirection(yawDegrees: number, pitchDegrees: number): Vec3 {
  const yaw = (yawDegrees * Math.PI) / 180;
  const pitch = (pitchDegrees * Math.PI) / 180;
  return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
}

// Where the camera stands to show a box from this side: as near as its corners allow.
export function frameBox(box: Box, yaw: number, pitch: number, aspect: number, shadowFrom?: Vec3): MeshFrame {
  const framed: Box = { min: [...box.min], max: [...box.max] };
  if (shadowFrom) {
    // The shadow falls away from the light, as far as the scene is high. A low sun is not followed to the horizon.
    const height = framed.max[1] - framed.min[1];
    for (const axis of [0, 2]) {
      const reach = -(height * shadowFrom[axis]) / Math.max(shadowFrom[1], LOWEST_FOLLOWED);
      framed.min[axis] += Math.min(reach, 0);
      framed.max[axis] += Math.max(reach, 0);
    }
  }
  const center = boxCenter(framed);
  const tanV = Math.tan(FOV / 2);
  const back = eyeDirection(yaw, pitch);
  const right = normalize(cross(WORLD_UP, back));
  const up = cross(back, right);
  let distance = 0;
  for (let index = 0; index < 8; index++) {
    const corner = boxCorner(framed, index).map((value, axis) => value - center[axis]);
    const toward = dot(corner, back);
    distance = Math.max(
      distance,
      Math.abs(dot(corner, right)) / (tanV * aspect) + toward,
      Math.abs(dot(corner, up)) / tanV + toward,
    );
  }
  return { center, radius: Math.max(boxDiagonal(framed) / 2, 1e-3), distance: distance * FRAME_MARGIN };
}

export function makeCamera(
  frame: MeshFrame,
  yaw: number,
  pitch: number,
  aspect: number,
  window: StageWindow = WHOLE_STAGE,
): Camera {
  const { center, radius, distance } = frame;
  const back = eyeDirection(yaw, pitch);
  const eye = center.map((value, axis) => value + back[axis] * distance) as Vec3;
  const range = distance + radius * 4;
  const stage = multiply(
    perspective(FOV, aspect, Math.max(distance - radius * 4, distance * 0.01), range),
    lookAt(eye, center, WORLD_UP),
  );
  const right = normalize(cross(WORLD_UP, back));
  const [left, bottom, far, top] = window;
  const crop = windowMatrix(
    2 / (far - left),
    2 / (top - bottom),
    -(far + left) / (far - left),
    -(top + bottom) / (top - bottom),
  );
  return {
    eye,
    range,
    stage,
    window,
    viewProjection: multiply(crop, stage),
    back,
    right,
    up: cross(back, right),
    aspect,
  };
}

// A point on the whole stage from -1 to 1 and its depth, or undefined behind the camera.
export function project(camera: Camera, point: readonly number[]): Vec3 | undefined {
  const m = camera.stage;
  const [x, y, z] = point;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0) {
    return undefined;
  }
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

// A point of the whole stage in the coordinates of the canvas, or undefined where it is not drawn.
export function toWindow(camera: Camera, x: number, y: number): [number, number] | undefined {
  const [left, bottom, right, top] = camera.window;
  if (x < left || x > right || y < bottom || y > top) {
    return undefined;
  }
  return [((x - left) / (right - left)) * 2 - 1, ((y - bottom) / (top - bottom)) * 2 - 1];
}

// Where a ray through a point of the stage, from -1 to 1, meets a surface given as the matrix of its square from -1 to 1.
export function planeHit(camera: Camera, matrix: Mat4, x: number, y: number): PlaneHit | undefined {
  const across: Vec3 = [matrix[0], matrix[1], matrix[2]];
  const along: Vec3 = [matrix[4], matrix[5], matrix[6]];
  const origin: Vec3 = [matrix[12], matrix[13], matrix[14]];
  const tan = Math.tan(FOV / 2);
  const direction = [0, 1, 2].map(
    axis => -camera.back[axis] + camera.right[axis] * x * tan * camera.aspect + camera.up[axis] * y * tan,
  );
  const normal = cross(across, along);
  const facing = dot(direction, normal);
  if (Math.abs(facing) < 1e-9) {
    return undefined;
  }
  const t =
    dot(
      origin.map((value, axis) => value - camera.eye[axis]),
      normal,
    ) / facing;
  if (t <= 0) {
    return undefined;
  }
  const offset = direction.map((value, axis) => camera.eye[axis] + value * t - origin[axis]);
  return {
    distance: t * Math.hypot(direction[0], direction[1], direction[2]),
    x: (dot(offset, across) / dot(across, across) + 1) / 2,
    y: (1 - dot(offset, along) / dot(along, along)) / 2,
  };
}
