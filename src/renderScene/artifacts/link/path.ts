import type { PathType } from '../../../model/link';
import type { SceneLinkSegment, ScenePath } from '../../scene';
import type { PathSegment } from './geometry/routing/types';
import { markerForEnd } from './markers';
import { roundedOrthogonalPathData } from './roundedOrthogonalPathData';
import type { LinkRenderContext } from './types';

function polylinePathData(points: number[]): string {
  let path = `M ${points[0]} ${points[1]}`;
  for (let index = 2; index < points.length; index += 2) {
    path += ` L ${points[index]} ${points[index + 1]}`;
  }
  return path;
}

function pathData(points: number[], pathType: PathType, segments: PathSegment[], strokeWidth: number): string {
  if (points.length < 4) {
    return '';
  }
  if (pathType === 'curved' && points.length >= 8) {
    return `M ${points[0]} ${points[1]} C ${points[2]} ${points[3]} ${points[4]} ${points[5]} ${points[6]} ${points[7]}`;
  }
  if (pathType === 'orthogonal' && segments.length > 0) {
    return roundedOrthogonalPathData(segments, Math.max(16, strokeWidth * 4));
  }
  return polylinePathData(points);
}

const round = (value: number): number => Math.round(value * 100) / 100;

function movableSegments(pathType: PathType, segments: PathSegment[]): SceneLinkSegment[] | undefined {
  if (pathType !== 'orthogonal' || !segments.some(segment => segment.canMove)) {
    return undefined;
  }
  return segments.map(segment => ({
    ax: round(segment.start.x),
    ay: round(segment.start.y),
    bx: round(segment.end.x),
    by: round(segment.end.y),
    ox: round(segment.originalMidpoint.x),
    oy: round(segment.originalMidpoint.y),
    movable: segment.canMove,
  }));
}

export function renderLinkPath(context: LinkRenderContext): ScenePath {
  const { link } = context;
  return {
    type: 'path',
    id: `link-${link.id}`,
    order: context.order,
    bounds: context.bounds,
    d: pathData(context.points, context.pathType, context.segments, context.strokeWidth),
    style: context.style,
    markerStart: markerForEnd(link, 'start'),
    markerEnd: markerForEnd(link, 'end'),
    detail: {
      of: 'link',
      fromId: link.fromId,
      toId: link.toId,
      route: context.pathType,
      fromSide: link.fromPoint?.kind === 'side' ? link.fromPoint.side : undefined,
      toSide: link.toPoint?.kind === 'side' ? link.toPoint.side : undefined,
      fromFace: link.fromPoint?.kind === 'face' ? link.fromPoint.face : undefined,
      toFace: link.toPoint?.kind === 'face' ? link.toPoint.face : undefined,
      labelGap: context.hasLabelGap,
      segments: movableSegments(context.pathType, context.segments),
    },
  };
}
