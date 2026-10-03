import type { Point } from '../geometry/types';
import type { IsometricObject } from './types';

export interface IsometricFaces {
  top: [Point, Point, Point, Point];
  front: [Point, Point, Point, Point];
  side: [Point, Point, Point, Point];
}

// Fixed true-isometric angle: width and depth are independent true edge
// lengths, each always drawn at this same angle from horizontal, never
// derived from one another. That's what makes scaling one axis a pure
// translation of everything on that side along a fixed line, with the
// other axis's geometry completely untouched - a shared "depth controls
// both edges' vertical reach" parametrization (the previous formula) can't
// give that: changing one of two values sharing a single term always
// reshapes the other's angle too.
const AXIS_ANGLE = Math.PI / 6; // 30°
export const AXIS_COS = Math.cos(AXIS_ANGLE);
export const AXIS_SIN = Math.sin(AXIS_ANGLE);

export interface IsometricBoundsFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The on-screen bounding box, derived from the true width/height/depth
 *  edge lengths - it is no longer an independently stored value. Shared by
 *  the renderer (selection bounds, label/shadow placement) and the runtime
 *  (axis-handle placement, resize drag math) so both agree on exactly the
 *  same box. */
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

/** The center of the top face (average of apex/right/center/left). The
 *  label and its guide line anchor here, in both x AND y: moving only the
 *  x the way a plain "centered label" would reduces to a horizontal-only
 *  motion that doesn't match how the top face itself moves when width or
 *  depth changes - that corner's own displacement is diagonal, at the same
 *  fixed axis angle as the edges, not purely horizontal. Anchoring to the
 *  real centroid means the label rides that same diagonal instead of
 *  visibly lagging/leading it. */
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

  // apex sits `depth`'s horizontal footprint in from the bounding box's
  // left edge, so `left` (apex + toLeft) lands exactly on it.
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
