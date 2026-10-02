import { PATH_POINT_INDEX_ATTR } from '../../../svg/domContract/attributes';
import { pathGeometryOf } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const HALO_EXTRA_WIDTH_PX = 4;
const POINT_RADIUS_PX = 5;
const POINT_STROKE_WIDTH_PX = 1.5;

export const PATH_HALO_ATTR = 'data-sf-path-halo';

function pathHalo(document: Document, primary: SVGPathElement, svg: SVGSVGElement): SVGPathElement {
  const halo = svgElement(document, 'path');
  halo.setAttribute(PATH_HALO_ATTR, '');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', RING_COLOR);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + screenPx(svg, HALO_EXTRA_WIDTH_PX)));
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('opacity', '0.5');
  return halo;
}

function pointHandle(document: Document, x: number, y: number, index: number, svg: SVGSVGElement): SVGCircleElement {
  const handle = svgElement(document, 'circle');
  handle.setAttribute('cx', String(x));
  handle.setAttribute('cy', String(y));
  handle.setAttribute('r', String(screenPx(svg, POINT_RADIUS_PX)));
  handle.setAttribute('fill', '#ffffff');
  handle.setAttribute('stroke', RING_COLOR);
  handle.setAttribute('stroke-width', String(screenPx(svg, POINT_STROKE_WIDTH_PX)));
  handle.setAttribute(PATH_POINT_INDEX_ATTR, String(index));
  handle.style.pointerEvents = 'auto';
  handle.style.cursor = 'move';
  return handle;
}

export function pathSelectionOverlay(
  document: Document,
  primary: SVGPathElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const group = selectionOverlayGroup(document, id, primary);
  group.appendChild(pathHalo(document, primary, svg));
  const geometry = pathGeometryOf(primary);
  for (const [index, [x, y]] of (geometry?.points ?? []).entries()) {
    group.appendChild(pointHandle(document, x, y, index, svg));
  }
  return group;
}
