import type { Point } from '../geometry/types';
import type { IsometricObject } from './types';

export interface IsometricFaces {
  top: [Point, Point, Point, Point];
  front: [Point, Point, Point, Point];
  side: [Point, Point, Point, Point];
}

export function isometricFaces(
  object: Pick<
    IsometricObject,
    'x' | 'y' | 'width' | 'height' | 'depth'
  >,
): IsometricFaces {
  const { x, y, width, height } = object;
  const depth = Math.max(
    0,
    Math.min(object.depth, width / 2, height / 2),
  );

  const top = { x: x + width / 2, y };
  const left = { x, y: y + depth };
  const center = { x: x + width / 2, y: y + depth * 2 };
  const right = { x: x + width, y: y + depth };
  const bottomLeft = { x, y: y + height - depth };
  const bottom = { x: x + width / 2, y: y + height };
  const bottomRight = {
    x: x + width,
    y: y + height - depth,
  };

  return {
    top: [top, right, center, left],
    front: [left, center, bottom, bottomLeft],
    side: [center, right, bottomRight, bottom],
  };
}