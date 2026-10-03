import { isometricGeometryOf, symbolDeclaredBounds } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const RING_STROKE_WIDTH_PX = 3;
const RING_OFFSET_PX = 1;
const HANDLE_RADIUS_PX = 5;
const HANDLE_STROKE_WIDTH_PX = 1.5;

export type IsometricAxis = 'width' | 'height' | 'depth';

const AXIS_CURSORS: Record<IsometricAxis, string> = {
  width: 'ew-resize',
  height: 'ns-resize',
  depth: 'ns-resize',
};

function axisHandle(
  document: Document,
  x: number,
  y: number,
  axis: IsometricAxis,
  svg: SVGSVGElement,
): SVGCircleElement {
  const handle = svgElement(document, 'circle');
  handle.setAttribute('cx', String(x));
  handle.setAttribute('cy', String(y));
  handle.setAttribute('r', String(screenPx(svg, HANDLE_RADIUS_PX)));
  handle.setAttribute('fill', '#ffffff');
  handle.setAttribute('stroke', RING_COLOR);
  handle.setAttribute('stroke-width', String(screenPx(svg, HANDLE_STROKE_WIDTH_PX)));
  handle.setAttribute('data-sf-resize-handle', `iso-${axis}`);
  handle.style.pointerEvents = 'auto';
  handle.style.cursor = AXIS_CURSORS[axis];
  return handle;
}

// Three circular axis handles instead of the generic rectangle's eight
// square ones - dragging one changes exactly one of width/height/depth,
// so the box always keeps its isometric angles instead of the generic
// resize's free (and angle-breaking) two-axis stretch. Positioned at the
// three outer vertices that each belong to only one dimension: `right`
// (width), `bottom` (height), `left` (depth) - see isometricFaces.
export function isometricSelectionOverlay(
  document: Document,
  primary: SVGGraphicsElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const bounds = symbolDeclaredBounds(primary) ?? primary.getBBox();
  const depth = isometricGeometryOf(primary)?.depth ?? 0;
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
  group.appendChild(axisHandle(document, bounds.x + bounds.width, bounds.y + depth, 'width', svg));
  group.appendChild(axisHandle(document, bounds.x + bounds.width / 2, bounds.y + bounds.height, 'height', svg));
  group.appendChild(axisHandle(document, bounds.x, bounds.y + depth, 'depth', svg));
  return group;
}
