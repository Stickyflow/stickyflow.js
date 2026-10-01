import { edgePointToward, elementCenter } from '../../model/geometry/edgePoint';
import { type PathSegment, portToPoint, type Rect, type Side } from '../../model/geometry/router';
import type { Link, PathType } from '../../model/link';
import { getLineMidpoint, getPathPoints, roundedOrthogonalPathData } from '../../model/link/geometry';

export function centerOf(bounds: Rect): { x: number; y: number } {
  return elementCenter(bounds);
}

export function anchorPoint(bounds: Rect, side: Side | null, other: Rect): { x: number; y: number } {
  if (side) {
    return portToPoint(bounds, { side, offset: 0.5 });
  }
  return edgePointToward(bounds, other);
}

function polylinePathData(points: number[]): string {
  if (points.length < 4) {
    return '';
  }
  let path = `M ${points[0]} ${points[1]}`;
  for (let index = 2; index < points.length; index += 2) {
    path += ` L ${points[index]} ${points[index + 1]}`;
  }
  return path;
}

export function previewPathData(
  points: number[],
  segments: PathSegment[],
  pathType: PathType,
  strokeWidth: number,
): string {
  if (pathType === 'curved' && points.length >= 8) {
    return `M ${points[0]} ${points[1]} C ${points[2]} ${points[3]} ${points[4]} ${points[5]} ${points[6]} ${points[7]}`;
  }
  if (pathType === 'orthogonal' && segments.length > 0) {
    return roundedOrthogonalPathData(segments, Math.max(16, strokeWidth * 4));
  }
  return polylinePathData(points);
}

function previewLink(fromSide: Side | null, toSide: Side | null): Link {
  return {
    id: 'preview',
    fromId: '',
    toId: '',
    layer_group: '',
    order_key: '',
    is_visible: true,
    is_locked: false,
    fromPoint: fromSide ? { side: fromSide, offset: 0.5 } : undefined,
    toPoint: toSide ? { side: toSide, offset: 0.5 } : undefined,
  };
}

export function routePreviewLink(
  fromBounds: Rect,
  toBounds: Rect,
  fromSide: Side | null,
  toSide: Side | null,
  pathType: PathType,
) {
  const from = anchorPoint(fromBounds, fromSide, toBounds);
  const to = anchorPoint(toBounds, toSide, fromBounds);
  const { points, segments } = getPathPoints(previewLink(fromSide, toSide), from, to, pathType);
  return { points, segments, midpoint: getLineMidpoint(points, pathType, from, to) };
}
