import { selectionOverlayGroup, svgElement } from './dom';
import { screenPx } from './scale';
import type { LinkEndpoint } from './types';

const RING_COLOR = '#9b42df';
const HALO_EXTRA_WIDTH_PX = 4;
const ENDPOINT_RADIUS_PX = 5;
const ENDPOINT_STROKE_WIDTH_PX = 1.5;

function linkHalo(document: Document, primary: SVGPathElement, svg: SVGSVGElement): SVGPathElement {
  const halo = svgElement(document, 'path');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', RING_COLOR);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + screenPx(svg, HALO_EXTRA_WIDTH_PX)));
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('opacity', '0.5');
  return halo;
}

function endpointHandle(
  document: Document,
  primary: SVGPathElement,
  atLength: number,
  endpoint: LinkEndpoint,
  svg: SVGSVGElement,
): SVGCircleElement {
  const point = primary.getPointAtLength(atLength);
  const handle = svgElement(document, 'circle');
  handle.setAttribute('cx', String(point.x));
  handle.setAttribute('cy', String(point.y));
  handle.setAttribute('r', String(screenPx(svg, ENDPOINT_RADIUS_PX)));
  handle.setAttribute('fill', RING_COLOR);
  handle.setAttribute('stroke', 'white');
  handle.setAttribute('stroke-width', String(screenPx(svg, ENDPOINT_STROKE_WIDTH_PX)));
  handle.setAttribute('data-sf-link-endpoint', endpoint);
  handle.style.pointerEvents = 'auto';
  handle.style.cursor = 'crosshair';
  return handle;
}

const SEGMENT_LENGTH_PX = 22;
const SEGMENT_THICKNESS_PX = 8;

interface LinkSegmentData {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  movable: boolean;
}

function readSegments(primary: SVGPathElement): LinkSegmentData[] {
  try {
    return JSON.parse(primary.getAttribute('data-sf-link-segments') ?? '[]') as LinkSegmentData[];
  } catch {
    return [];
  }
}

function segmentHandles(document: Document, primary: SVGPathElement, svg: SVGSVGElement): SVGRectElement[] {
  const handles: SVGRectElement[] = [];
  readSegments(primary).forEach((segment, index) => {
    if (!segment.movable) {
      return;
    }
    const horizontal = Math.abs(segment.bx - segment.ax) > Math.abs(segment.by - segment.ay);
    const length = screenPx(svg, SEGMENT_LENGTH_PX);
    const thickness = screenPx(svg, SEGMENT_THICKNESS_PX);
    const width = horizontal ? length : thickness;
    const height = horizontal ? thickness : length;
    const handle = svgElement(document, 'rect');
    handle.setAttribute('x', String((segment.ax + segment.bx) / 2 - width / 2));
    handle.setAttribute('y', String((segment.ay + segment.by) / 2 - height / 2));
    handle.setAttribute('width', String(width));
    handle.setAttribute('height', String(height));
    handle.setAttribute('rx', String(thickness / 2));
    handle.setAttribute('fill', 'white');
    handle.setAttribute('stroke', RING_COLOR);
    handle.setAttribute('stroke-width', String(screenPx(svg, ENDPOINT_STROKE_WIDTH_PX)));
    handle.setAttribute('data-sf-link-segment', String(index));
    handle.setAttribute('data-sf-link-segment-axis', horizontal ? 'y' : 'x');
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = horizontal ? 'ns-resize' : 'ew-resize';
    handles.push(handle);
  });
  return handles;
}

export function linkSelectionOverlay(
  document: Document,
  primary: SVGPathElement,
  id: string,
  svg: SVGSVGElement,
): SVGGElement {
  const group = selectionOverlayGroup(document, id, primary);
  const length = primary.getTotalLength();
  group.append(
    linkHalo(document, primary, svg),
    ...segmentHandles(document, primary, svg),
    endpointHandle(document, primary, 0, 'from', svg),
    endpointHandle(document, primary, length, 'to', svg),
  );
  return group;
}
