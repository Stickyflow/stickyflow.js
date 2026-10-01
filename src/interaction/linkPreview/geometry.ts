import { pointAtPort } from '../../model/geometry/ports';
import { edgePointToward, elementCenter } from '../../model/geometry/rectangle';
import type { Rect, Side } from '../../model/geometry/types';
import type { Link, PathType } from '../../model/link';
import { calculateLinkRoute, getLineMidpoint } from '../../rendering/entities/link/geometry';
import type { PathSegment } from '../../rendering/entities/link/geometry/routing/types';
import { roundedOrthogonalPathData } from '../../rendering/entities/link/roundedOrthogonalPathData';

export function centerOf(bounds: Rect): { x: number; y: number } {
  return elementCenter(bounds);
}

export function anchorPoint(bounds: Rect, side: Side | null, other: Rect): { x: number; y: number } {
  if (side) {
    return pointAtPort(bounds, { side, offset: 0.5 });
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
    layerGroup: '',
    orderKey: '',
    isVisible: true,
    isLocked: false,
    fromPoint: fromSide ? { kind: 'side', side: fromSide, offset: 0.5 } : undefined,
    toPoint: toSide ? { kind: 'side', side: toSide, offset: 0.5 } : undefined,
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
  const { points, segments } = calculateLinkRoute(previewLink(fromSide, toSide), from, to, pathType);
  return { points, segments, midpoint: getLineMidpoint(points, pathType, from, to) };
}
