import type { Side } from '../../model/geometry/types';
import type { Link } from '../../model/link';
import { calculateLinkRoute } from '../../rendering/entities/link/geometry';
import { previewPathData } from '../linkPreview';
import type { LinkEndpointDragState } from './state';

function previewLink(fromSide: Side, toSide: Side): Link {
  return {
    id: 'preview',
    fromId: '',
    toId: '',
    layerGroup: '',
    orderKey: '',
    isVisible: true,
    isLocked: false,
    fromPoint: { kind: 'side', side: fromSide, offset: 0.5 },
    toPoint: { kind: 'side', side: toSide, offset: 0.5 },
  };
}

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
