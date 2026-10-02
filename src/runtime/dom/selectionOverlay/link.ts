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
    endpointHandle(document, primary, 0, 'from', svg),
    endpointHandle(document, primary, length, 'to', svg),
  );
  return group;
}
