import { pxPerUnit, SVG_NAMESPACE } from '../../domContract';
import type { Side } from '../../model/geometry/router';
import { getPathPoints } from '../../model/link/geometry';
import type { Link, PathType } from '../../model/links';
import { previewPathData } from '../linkPreview';
import type { QuickDuplicateDragState } from './state';

const PREVIEW_STROKE_PX = 2;
const NEW_LINK_PATH_TYPE: PathType = 'orthogonal';

export function createDuplicatePreviewPath(svg: SVGSVGElement): SVGPathElement {
  const path = svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-width', String(PREVIEW_STROKE_PX / pxPerUnit(svg)));
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
