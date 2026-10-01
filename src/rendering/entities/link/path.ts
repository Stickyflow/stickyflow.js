import type { PathSegment } from '../../../model/geometry/routing';
import type { PathType } from '../../../model/link';
import { roundedOrthogonalPathData } from '../../../model/link/geometry';
import type { ScenePath } from '../../scene';
import { markerForEnd } from './markers';
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
      fromSide: link.fromPoint && 'side' in link.fromPoint ? link.fromPoint.side : undefined,
      toSide: link.toPoint && 'side' in link.toPoint ? link.toPoint.side : undefined,
      labelGap: context.hasLabelGap,
    },
  };
}
