import type { Point } from '../geometry/types';
import type { IsometricObject } from './types';

export interface IsometricFaces {
  top: [Point, Point, Point, Point];
  front: [Point, Point, Point, Point];
  side: [Point, Point, Point, Point];
}

const AXIS_ANGLE = Math.PI / 6; // 30°
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
  const bottom = { x: center.x + down.x, y: center.y + down.y };
  const bottomLeft = { x: left.x + down.x, y: left.y + down.y };
  const bottomRight = { x: right.x + down.x, y: right.y + down.y };

  return {
    top: [apex, right, center, left],
    front: [left, center, bottom, bottomLeft],
    side: [center, right, bottomRight, bottom],
  };
}
