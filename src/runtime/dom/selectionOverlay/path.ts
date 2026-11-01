import { pathSegments } from '../../../model/path';
import { cornerFrame } from '../../../model/path/fillet';
import {
  PATH_CORNER_INDEX_ATTR,
  PATH_INSERT_INDEX_ATTR,
  PATH_POINT_INDEX_ATTR,
} from '../../../svg/domContract/attributes';
import { type PathGeometry, pathGeometryOf } from '../contract';
import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';

const RING_COLOR = '#9b42df';
const HALO_EXTRA_WIDTH_PX = 4;
const POINT_RADIUS_PX = 5;
const POINT_STROKE_WIDTH_PX = 1.5;
const CORNER_RADIUS_PX = 5;
const CORNER_OFFSET_PX = 18;
const INSERT_RADIUS_PX = 3.5;

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

export function cornerHandleOffset(svg: SVGSVGElement): number {
  return screenPx(svg, CORNER_OFFSET_PX);
}

// A handle inside every corner of a straight path, which sets the radius of that corner.
function cornerHandles(document: Document, geometry: PathGeometry, svg: SVGSVGElement): SVGCircleElement[] {
  const { points, closed, tension } = geometry;
  const count = points.length;
  if (tension > 0 || count < 3) {
    return [];
  }
  const at = (index: number) => {
    const [x, y] = points[(index + count) % count];
    return { x, y };
  };
  return points.flatMap((_, index) => {
    if (!closed && (index === 0 || index === count - 1)) {
      return [];
    }
    const corner = at(index);
    const frame = cornerFrame(at(index - 1), corner, at(index + 1));
    if (!frame) {
      return [];
    }
    const radius = Math.min(geometry.cornerRadii[index] ?? 0, frame.maxRadius);
    const distance = cornerHandleOffset(svg) + radius / frame.halfSine;
    const handle = svgElement(document, 'circle');
    handle.setAttribute('cx', String(corner.x + frame.inward.x * distance));
    handle.setAttribute('cy', String(corner.y + frame.inward.y * distance));
    handle.setAttribute('r', String(screenPx(svg, CORNER_RADIUS_PX)));
    handle.setAttribute('fill', RING_COLOR);
    handle.setAttribute('stroke', '#ffffff');
    handle.setAttribute('stroke-width', String(screenPx(svg, POINT_STROKE_WIDTH_PX)));
    handle.setAttribute(PATH_CORNER_INDEX_ATTR, String(index));
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = 'move';
    return [handle];
  });
}

// A small handle in the middle of every section of the path, which adds a point there.
function insertHandles(document: Document, geometry: PathGeometry, svg: SVGSVGElement): SVGCircleElement[] {
  const points = geometry.points.map(([x, y]) => ({ x, y }));
  let from = points[0];
  return pathSegments({ points, tension: geometry.tension, closed: geometry.closed }).map(({ to, controls }, index) => {
    const start = from;
    from = to;
    const handle = svgElement(document, 'circle');
    const [x, y] = controls
      ? [
          0.125 * start.x + 0.375 * controls[0].x + 0.375 * controls[1].x + 0.125 * to.x,
          0.125 * start.y + 0.375 * controls[0].y + 0.375 * controls[1].y + 0.125 * to.y,
        ]
      : [(start.x + to.x) / 2, (start.y + to.y) / 2];
    handle.setAttribute('cx', String(x));
    handle.setAttribute('cy', String(y));
    handle.setAttribute('r', String(screenPx(svg, INSERT_RADIUS_PX)));
    handle.setAttribute('fill', '#ffffff');
    handle.setAttribute('stroke', RING_COLOR);
    handle.setAttribute('stroke-width', String(screenPx(svg, POINT_STROKE_WIDTH_PX)));
    handle.setAttribute('opacity', '0.75');
    handle.setAttribute(PATH_INSERT_INDEX_ATTR, String(index));
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = 'move';
    return handle;
  });
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
  if (geometry) {
    group.append(...insertHandles(document, geometry, svg));
  }
  for (const [index, [x, y]] of (geometry?.points ?? []).entries()) {
    group.appendChild(pointHandle(document, x, y, index, svg));
  }
  if (geometry) {
    group.append(...cornerHandles(document, geometry, svg));
  }
  return group;
}
