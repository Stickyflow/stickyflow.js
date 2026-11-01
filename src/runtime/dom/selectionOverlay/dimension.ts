import { dimensionGeometry } from '../../../model/dimension';
import { DIMENSION_HANDLE_ATTR } from '../../../svg/domContract/attributes';
import { dimensionGeometryOf } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const RADIUS_PX = 5;
const STROKE_WIDTH_PX = 1.5;

export function dimensionSelectionOverlay(
  document: Document,
  primary: SVGGraphicsElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const group = selectionOverlayGroup(document, id, primary);
  const geometry = dimensionGeometryOf(primary);
  if (!geometry) {
    return group;
  }
  const { line } = dimensionGeometry(geometry);
  const handles = [
    ['start', geometry.start, '#ffffff'],
    ['end', geometry.end, '#ffffff'],
    ['offset', { x: line[0].x * 0.75 + line[1].x * 0.25, y: line[0].y * 0.75 + line[1].y * 0.25 }, RING_COLOR],
  ] as const;
  for (const [name, point, fill] of handles) {
    const handle = svgElement(document, 'circle');
    handle.setAttribute('cx', String(point.x));
    handle.setAttribute('cy', String(point.y));
    handle.setAttribute('r', String(screenPx(svg, RADIUS_PX)));
    handle.setAttribute('fill', fill);
    handle.setAttribute('stroke', name === 'offset' ? '#ffffff' : RING_COLOR);
    handle.setAttribute('stroke-width', String(screenPx(svg, STROKE_WIDTH_PX)));
    handle.setAttribute(DIMENSION_HANDLE_ATTR, name);
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = 'move';
    group.appendChild(handle);
  }
  return group;
}
