import { selectionOverlayGroup, svgElement } from './dom';
import { renderResizeHandles } from './resizeHandles';

const RING_COLOR = '#9b42df';

export function shapeSelectionOverlay(document: Document, primary: SVGGraphicsElement, id: string): SVGGElement {
  const bounds = primary.getBBox();
  const group = selectionOverlayGroup(document, id, primary);
  const ring = svgElement(document, 'rect');
  ring.setAttribute('x', String(bounds.x - 1));
  ring.setAttribute('y', String(bounds.y - 1));
  ring.setAttribute('width', String(bounds.width + 2));
  ring.setAttribute('height', String(bounds.height + 2));
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', RING_COLOR);
  ring.setAttribute('stroke-width', '3');
  group.appendChild(ring);
  group.append(...renderResizeHandles(document, bounds));
  return group;
}
