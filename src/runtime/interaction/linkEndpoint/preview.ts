import type { Side } from '../../../model/geometry/types';
import { calculateLinkRoute } from '../../../renderScene/artifacts/link/geometry';
import { previewPathData } from '../linkPreview';
import { previewLink } from '../linkPreview/geometry';
import type { LinkEndpointDragState } from './state';

export function updateEndpointPreview(
  drag: LinkEndpointDragState,
  draggedPoint: { x: number; y: number },
  draggedSide: Side,
): void {
  const fromPoint = drag.end === 'from' ? draggedPoint : drag.fixedPoint;
  const toPoint = drag.end === 'to' ? draggedPoint : drag.fixedPoint;
  const fromSide = drag.end === 'from' ? draggedSide : drag.fixedSide;
  const toSide = drag.end === 'to' ? draggedSide : drag.fixedSide;
  const { points, segments } = calculateLinkRoute(previewLink(fromSide, toSide), fromPoint, toPoint, drag.pathType);
  drag.path.setAttribute('d', previewPathData(points, segments, drag.pathType, drag.strokeWidth));
}
