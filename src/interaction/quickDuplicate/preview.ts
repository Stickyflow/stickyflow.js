import { getPathPoints } from '../../model/geometry/connectionLine';
import type { Side } from '../../model/geometry/router';
import type { Link, PathType } from '../../model/links';
import { previewPathData } from '../linkPreview';
import type { QuickDuplicateDragState } from './state';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PREVIEW_STROKE = '#9b42df';
const NEW_LINK_PATH_TYPE: PathType = 'orthogonal';

export function createDuplicatePreviewPath(): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', PREVIEW_STROKE);
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-dasharray', '6 4');
  path.style.pointerEvents = 'none';
  return path;
}

function previewLink(fromSide: Side, toSide: Side): Link {
  return {
    id: 'preview',
    fromId: '',
    toId: '',
    layer_group: '',
    order_key: '',
    is_visible: true,
    is_locked: false,
    fromPoint: { side: fromSide, offset: 0.5 },
    toPoint: { side: toSide, offset: 0.5 },
  };
}

export function updateDuplicatePreview(
  drag: QuickDuplicateDragState,
  toPoint: { x: number; y: number },
  toSide: Side,
): void {
  const link = previewLink(drag.direction, toSide);
  const { points, segments } = getPathPoints(link, drag.fixedPoint, toPoint, NEW_LINK_PATH_TYPE);
  drag.previewPath.setAttribute('d', previewPathData(points, segments, NEW_LINK_PATH_TYPE, 2));
}
