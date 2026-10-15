import type { Point } from '../geometry/types';
import type { IsometricFace, IsometricObject } from './types';

export interface IsometricFaces {
  top: [Point, Point, Point, Point];
  bottom: [Point, Point, Point, Point];
  front: [Point, Point, Point, Point];
  back: [Point, Point, Point, Point];
  left: [Point, Point, Point, Point];
  right: [Point, Point, Point, Point];
}

export const VISIBLE_ISOMETRIC_FACES: ReadonlySet<IsometricFace> = new Set(['top', 'front', 'right']);

const AXIS_ANGLE = Math.PI / 6;
export const AXIS_COS = Math.cos(AXIS_ANGLE);
export const AXIS_SIN = Math.sin(AXIS_ANGLE);

export interface IsometricBoundsFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isometricBounds(
  object: Pick<IsometricObject, 'x' | 'y' | 'width' | 'height' | 'depth'>,
): IsometricBoundsFrame {
  const width = Math.max(0, object.width);
  const height = Math.max(0, object.height);
  const depth = Math.max(0, object.depth);
  return {
    x: object.x,
    y: object.y,
    width: (width + depth) * AXIS_COS,
    height: height + (width + depth) * AXIS_SIN,
  };
}

export function isometricTopFaceCenter(object: Pick<IsometricObject, 'x' | 'y' | 'width' | 'height' | 'depth'>): Point {
  const width = Math.max(0, object.width);
  const depth = Math.max(0, object.depth);
  return {
    x: object.x + ((width + depth) * AXIS_COS) / 2,
    y: object.y + ((width + depth) * AXIS_SIN) / 2,
  };
}

function faceCenter(corners: readonly [Point, Point, Point, Point]): Point {
  return {
    x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
    y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4,
  };
}

export function isometricFaceCenter(
  object: Pick<IsometricObject, 'x' | 'y' | 'width' | 'height' | 'depth'>,
  face: IsometricFace,
): Point {
  return faceCenter(isometricFaces(object)[face]);
}

export function isometricFaces(
  object: Pick<IsometricObject, 'x' | 'y' | 'width' | 'height' | 'depth'>,
): IsometricFaces {
  const { x, y } = object;
  const width = Math.max(0, object.width);
  const height = Math.max(0, object.height);
  const depth = Math.max(0, object.depth);

  const apex = { x: x + depth * AXIS_COS, y };
  const toRight = { x: width * AXIS_COS, y: width * AXIS_SIN };
  const toLeft = { x: -depth * AXIS_COS, y: depth * AXIS_SIN };
  const down = { x: 0, y: height };

  const right = { x: apex.x + toRight.x, y: apex.y + toRight.y };
  const left = { x: apex.x + toLeft.x, y: apex.y + toLeft.y };
  const center = { x: apex.x + toRight.x + toLeft.x, y: apex.y + toRight.y + toLeft.y };
  const apexDown = { x: apex.x + down.x, y: apex.y + down.y };
  const bottom = { x: center.x + down.x, y: center.y + down.y };
  const bottomLeft = { x: left.x + down.x, y: left.y + down.y };
  const bottomRight = { x: right.x + down.x, y: right.y + down.y };

  return {
    top: [apex, right, center, left],
    bottom: [apexDown, bottomRight, bottom, bottomLeft],
    front: [left, center, bottom, bottomLeft],
    back: [apex, right, bottomRight, apexDown],
    right: [center, right, bottomRight, bottom],
    left: [apex, left, bottomLeft, apexDown],
  };
}
