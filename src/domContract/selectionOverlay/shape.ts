import { symbolDeclaredBounds } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { renderResizeHandles } from './resizeHandles';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const RING_STROKE_WIDTH_PX = 3;
const RING_OFFSET_PX = 1;

export function shapeSelectionOverlay(
  document: Document,
  primary: SVGGraphicsElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const bounds = symbolDeclaredBounds(primary) ?? primary.getBBox();
  const group = selectionOverlayGroup(document, id, primary);
  const offset = screenPx(svg, RING_OFFSET_PX);
  const ring = svgElement(document, 'rect');
  ring.setAttribute('x', String(bounds.x - offset));
  ring.setAttribute('y', String(bounds.y - offset));
  ring.setAttribute('width', String(bounds.width + offset * 2));
  ring.setAttribute('height', String(bounds.height + offset * 2));
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', RING_COLOR);
  ring.setAttribute('stroke-width', String(screenPx(svg, RING_STROKE_WIDTH_PX)));
  group.appendChild(ring);
  group.append(...renderResizeHandles(document, bounds, svg));
  return group;
}
