import { isometricFaces } from '../../../model/isometricObject';
import { isometricGeometryOf, symbolDeclaredBounds } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import {
  BUBBLE_RADIUS_PX,
  BUBBLE_STROKE_WIDTH_PX,
  duplicateBubble,
  duplicatePlus,
  PLUS_HALF_SIZE_PX,
} from './quickDuplicate';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const HALO_EXTRA_WIDTH_PX = 2;
const SHAFT_WIDTH_PX = 3.25;
const HIT_WIDTH_PX = 14;
const ARROW_LENGTH_PX = 34;
const ARROWHEAD_LENGTH_PX = 10.5;
const ARROWHEAD_WIDTH_PX = 8.5;

export type IsometricAxis = 'width' | 'height' | 'depth';

export interface Vec {
  x: number;
  y: number;
}

export function normalizeVec(v: Vec): Vec {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

// width/depth point at the fixed 30deg axis angle - no native CSS cursor
// (nwse/nesw-resize are 45) matches that, so the cursor is a tiny inline
// double-headed-arrow SVG rotated to the arrow's own exact direction
// instead, built from the same `direction` vector the arrow itself is
// drawn with, so the two can never drift out of sync with each other.
function axisCursorUrl(direction: Vec): string {
  const angleDeg = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">` +
    `<g transform="rotate(${angleDeg} 13 13)" stroke-linejoin="round" stroke-linecap="round">` +
    `<line x1="4" y1="13" x2="22" y2="13" stroke="white" stroke-width="4.5"/>` +
    `<line x1="4" y1="13" x2="22" y2="13" stroke="black" stroke-width="1.6"/>` +
    `<path d="M4 13 L9.5 8.5 L9.5 17.5 Z" fill="black" stroke="white" stroke-width="1.5"/>` +
    `<path d="M22 13 L16.5 8.5 L16.5 17.5 Z" fill="black" stroke="white" stroke-width="1.5"/>` +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 13 13, pointer`;
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
function createAxisArrow(document: Document, axis: IsometricAxis, direction: Vec, svg: SVGSVGElement): ArrowElements {
  const group = svgElement(document, 'g');
  group.setAttribute('data-sf-resize-handle', `iso-${axis}`);
  group.style.cursor = axisCursorUrl(direction);

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
  const elements = createAxisArrow(document, axis, direction, svg);
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

const DUPLICATE_MARGIN_PX = 18;

export type IsometricQuickDuplicateDirection =
  | 'iso-width-pos'
  | 'iso-width-neg'
  | 'iso-depth-pos'
  | 'iso-depth-neg'
  | 'iso-height-pos'
  | 'iso-height-neg';

function reflect(point: Vec, through: Vec): Vec {
  return { x: through.x * 2 - point.x, y: through.y * 2 - point.y };
}

/** One bubble per cube face (all 6, not just the 3 that happen to be
 *  visible) so a copy can be spun off in any direction, each offset exactly
 *  along that axis's own true isometric vector. The 3 hidden faces (the
 *  ones axisArrowPlacements has no dedicated geometry for, since nothing is
 *  drawn there) get their origin by reflecting the opposite, visible face's
 *  origin through the object's own visual center - same distance out, exact
 *  opposite direction. */
export function quickDuplicatePlacements(
  object: IsometricSize,
): Record<IsometricQuickDuplicateDirection, { origin: Vec; direction: Vec }> {
  const faces = isometricFaces(object);
  const placements = axisArrowPlacements(object);
  const visualCenter = centroid([
    faces.top[0],
    faces.top[1],
    faces.top[2],
    faces.top[3],
    faces.front[2],
    faces.front[3],
    faces.side[2],
  ]);
  return {
    'iso-width-pos': placements.width,
    'iso-width-neg': {
      origin: reflect(placements.width.origin, visualCenter),
      direction: { x: -placements.width.direction.x, y: -placements.width.direction.y },
    },
    'iso-depth-pos': placements.depth,
    'iso-depth-neg': {
      origin: reflect(placements.depth.origin, visualCenter),
      direction: { x: -placements.depth.direction.x, y: -placements.depth.direction.y },
    },
    'iso-height-pos': placements.height,
    'iso-height-neg': {
      origin: reflect(placements.height.origin, visualCenter),
      direction: { x: -placements.height.direction.x, y: -placements.height.direction.y },
    },
  };
}

export const ISO_DUPLICATE_BUBBLES_ATTR = 'data-sf-iso-duplicate-bubbles';

export function isometricQuickDuplicateBubbles(
  document: Document,
  object: IsometricSize,
  svg: SVGSVGElement,
): SVGGElement {
  const group = svgElement(document, 'g');
  group.setAttribute(ISO_DUPLICATE_BUBBLES_ATTR, '');
  const radius = screenPx(svg, BUBBLE_RADIUS_PX);
  const margin = screenPx(svg, DUPLICATE_MARGIN_PX);
  const halfSize = screenPx(svg, PLUS_HALF_SIZE_PX);
  const strokeWidth = screenPx(svg, BUBBLE_STROKE_WIDTH_PX);
  for (const [direction, { origin, direction: dir }] of Object.entries(quickDuplicatePlacements(object)) as Array<
    [IsometricQuickDuplicateDirection, { origin: Vec; direction: Vec }]
  >) {
    const x = origin.x + dir.x * margin;
    const y = origin.y + dir.y * margin;
    group.append(
      duplicateBubble(document, x, y, radius, strokeWidth, direction),
      duplicatePlus(document, x, y, halfSize, strokeWidth),
    );
  }
  return group;
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
  group.appendChild(
    isometricQuickDuplicateBubbles(
      document,
      {
        x: bounds.x,
        y: bounds.y,
        width: geometry?.width ?? bounds.width,
        height: geometry?.height ?? bounds.height,
        depth: geometry?.depth ?? 0,
      },
      svg,
    ),
  );
  return group;
}
