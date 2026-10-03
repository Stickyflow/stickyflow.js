import { isometricFaces } from '../../../model/isometricObject';
import { isometricGeometryOf, symbolDeclaredBounds } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const HALO_EXTRA_WIDTH_PX = 2;
const SHAFT_WIDTH_PX = 2.5;
const HIT_WIDTH_PX = 14;
const ARROW_LENGTH_PX = 30;
const ARROWHEAD_LENGTH_PX = 9;
const ARROWHEAD_WIDTH_PX = 7;

export type IsometricAxis = 'width' | 'height' | 'depth';

const AXIS_CURSORS: Record<IsometricAxis, string> = {
  width: 'ew-resize',
  height: 'ns-resize',
  depth: 'ns-resize',
};

export interface Vec {
  x: number;
  y: number;
}

export function normalizeVec(v: Vec): Vec {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

function centroid(points: readonly Vec[]): Vec {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export const ISO_HALO_ATTR = 'data-sf-iso-halo';

interface ArrowElements {
  group: SVGGElement;
  hit: SVGLineElement;
  shaft: SVGLineElement;
  head: SVGPolygonElement;
}

// A vector handle instead of a resize-box handle: a shaft running outward
// from the object along the dimension's true isometric direction (the same
// angle that dimension's own edge is drawn at), capped with an arrowhead -
// grabbing and pulling it is the gesture, same as a 3D tool's per-axis
// scale gizmo. The visible shaft/head carry no pointer events of their own;
// a wider transparent line underneath is the actual (and easier-to-grab)
// hit target. updateAxisArrow (below) repositions these same elements
// during a live drag instead of rebuilding them from scratch.
function createAxisArrow(document: Document, axis: IsometricAxis, svg: SVGSVGElement): ArrowElements {
  const group = svgElement(document, 'g');
  group.setAttribute('data-sf-resize-handle', `iso-${axis}`);
  group.style.cursor = AXIS_CURSORS[axis];

  const hit = svgElement(document, 'line');
  hit.setAttribute('stroke', 'transparent');
  hit.setAttribute('stroke-width', String(screenPx(svg, HIT_WIDTH_PX)));
  hit.setAttribute('stroke-linecap', 'round');
  hit.style.pointerEvents = 'stroke';
  group.appendChild(hit);

  const shaft = svgElement(document, 'line');
  shaft.setAttribute('stroke', RING_COLOR);
  shaft.setAttribute('stroke-width', String(screenPx(svg, SHAFT_WIDTH_PX)));
  shaft.setAttribute('stroke-linecap', 'round');
  shaft.style.pointerEvents = 'none';
  group.appendChild(shaft);

  const head = svgElement(document, 'polygon');
  head.setAttribute('fill', RING_COLOR);
  head.style.pointerEvents = 'none';
  group.appendChild(head);

  return { group, hit, shaft, head };
}

function positionAxisArrow(elements: ArrowElements, origin: Vec, direction: Vec, svg: SVGSVGElement): void {
  const length = screenPx(svg, ARROW_LENGTH_PX);
  const headLength = screenPx(svg, ARROWHEAD_LENGTH_PX);
  const headWidth = screenPx(svg, ARROWHEAD_WIDTH_PX);
  const tip: Vec = { x: origin.x + direction.x * length, y: origin.y + direction.y * length };
  const shaftEnd: Vec = {
    x: origin.x + direction.x * (length - headLength),
    y: origin.y + direction.y * (length - headLength),
  };
  const normal: Vec = { x: -direction.y, y: direction.x };
  const headLeft: Vec = { x: shaftEnd.x + (normal.x * headWidth) / 2, y: shaftEnd.y + (normal.y * headWidth) / 2 };
  const headRight: Vec = { x: shaftEnd.x - (normal.x * headWidth) / 2, y: shaftEnd.y - (normal.y * headWidth) / 2 };

  elements.hit.setAttribute('x1', String(origin.x));
  elements.hit.setAttribute('y1', String(origin.y));
  elements.hit.setAttribute('x2', String(tip.x));
  elements.hit.setAttribute('y2', String(tip.y));

  elements.shaft.setAttribute('x1', String(origin.x));
  elements.shaft.setAttribute('y1', String(origin.y));
  elements.shaft.setAttribute('x2', String(shaftEnd.x));
  elements.shaft.setAttribute('y2', String(shaftEnd.y));

  elements.head.setAttribute('points', `${tip.x},${tip.y} ${headLeft.x},${headLeft.y} ${headRight.x},${headRight.y}`);
}

function axisArrow(
  document: Document,
  origin: Vec,
  direction: Vec,
  axis: IsometricAxis,
  svg: SVGSVGElement,
): SVGGElement {
  const elements = createAxisArrow(document, axis, svg);
  positionAxisArrow(elements, origin, direction, svg);
  return elements.group;
}

/** Re-aims an existing axis-arrow group (found via its `data-sf-resize-handle`
 *  value) during a live drag, instead of tearing it down and rebuilding it. */
export function updateAxisArrowGroup(group: SVGGElement, origin: Vec, direction: Vec, svg: SVGSVGElement): void {
  const hit = group.querySelector('line:nth-child(1)') as SVGLineElement | null;
  const shaft = group.querySelector('line:nth-child(2)') as SVGLineElement | null;
  const head = group.querySelector('polygon') as SVGPolygonElement | null;
  if (!hit || !shaft || !head) {
    return;
  }
  positionAxisArrow({ group, hit, shaft, head }, origin, direction, svg);
}

export function updateHalo(halo: SVGPathElement, d: string): void {
  halo.setAttribute('d', d);
}

export interface IsometricSize {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

/** The origin/direction for each axis arrow, shared between the initial
 *  overlay build and the live-drag reposition in isometricAxisResize.
 *  Width and depth originate at the center of the face they alone resize
 *  (side, front) rather than at a corner - "grab the face, slide it along
 *  its own axis" reads more directly than a corner handle does. Height has
 *  no dedicated third face to center on, so it keeps the bottom vertex. */
export function axisArrowPlacements(object: IsometricSize): Record<IsometricAxis, { origin: Vec; direction: Vec }> {
  const faces = isometricFaces(object);
  const apex = faces.top[0];
  const right = faces.top[1];
  const left = faces.top[3];
  const bottom = faces.front[2];
  return {
    width: { origin: centroid(faces.side), direction: normalizeVec({ x: right.x - apex.x, y: right.y - apex.y }) },
    height: { origin: bottom, direction: { x: 0, y: 1 } },
    depth: { origin: centroid(faces.front), direction: normalizeVec({ x: left.x - apex.x, y: left.y - apex.y }) },
  };
}

// Three vector handles instead of the generic rectangle's eight square
// resize handles - dragging one changes exactly one of width/height/depth,
// so the box always keeps its isometric angles instead of the generic
// resize's free (and angle-breaking) two-axis stretch.
export function isometricSelectionOverlay(
  document: Document,
  primary: SVGGraphicsElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const bounds = symbolDeclaredBounds(primary) ?? primary.getBBox();
  const geometry = isometricGeometryOf(primary);
  const group = selectionOverlayGroup(document, id, primary);

  const halo = svgElement(document, 'path');
  halo.setAttribute(ISO_HALO_ATTR, '');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', RING_COLOR);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + screenPx(svg, HALO_EXTRA_WIDTH_PX)));
  halo.setAttribute('opacity', '0.6');
  halo.style.pointerEvents = 'none';
  group.appendChild(halo);

  const placements = axisArrowPlacements({
    x: bounds.x,
    y: bounds.y,
    width: geometry?.width ?? bounds.width,
    height: geometry?.height ?? bounds.height,
    depth: geometry?.depth ?? 0,
  });
  group.appendChild(axisArrow(document, placements.width.origin, placements.width.direction, 'width', svg));
  group.appendChild(axisArrow(document, placements.height.origin, placements.height.direction, 'height', svg));
  group.appendChild(axisArrow(document, placements.depth.origin, placements.depth.direction, 'depth', svg));
  return group;
}
