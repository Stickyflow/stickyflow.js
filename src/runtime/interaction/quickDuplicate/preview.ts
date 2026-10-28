import type { Side } from '../../../model/geometry/types';
import type { PathType } from '../../../model/link';
import { calculateLinkRoute } from '../../../renderScene/artifacts/link/geometry';
import { pxPerUnit, SVG_NAMESPACE } from '../../dom';
import { previewPathData } from '../linkPreview';
import { previewLink } from '../linkPreview/geometry';
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

export function updateDuplicatePreview(
  drag: QuickDuplicateDragState,
  toPoint: { x: number; y: number },
  toSide: Side,
): void {
  const link = previewLink(drag.direction, toSide);
  const { points, segments } = calculateLinkRoute(link, drag.fixedPoint, toPoint, NEW_LINK_PATH_TYPE);
  drag.previewPath.setAttribute('d', previewPathData(points, segments, NEW_LINK_PATH_TYPE, 2));
}
