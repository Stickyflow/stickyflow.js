import { selectionOverlayGroup, svgElement } from './dom';
import type { LinkEndpoint } from './types';

const RING_COLOR = '#9b42df';

function linkHalo(document: Document, primary: SVGPathElement): SVGPathElement {
  const halo = svgElement(document, 'path');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', RING_COLOR);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + 4));
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('opacity', '0.5');
  return halo;
}

function endpointHandle(
  document: Document,
  primary: SVGPathElement,
  atLength: number,
  endpoint: LinkEndpoint,
): SVGCircleElement {
  const point = primary.getPointAtLength(atLength);
  const handle = svgElement(document, 'circle');
  handle.setAttribute('cx', String(point.x));
  handle.setAttribute('cy', String(point.y));
  handle.setAttribute('r', '5');
  handle.setAttribute('fill', RING_COLOR);
  handle.setAttribute('stroke', 'white');
  handle.setAttribute('stroke-width', '1.5');
  handle.setAttribute('data-sf-link-endpoint', endpoint);
  handle.style.pointerEvents = 'auto';
  handle.style.cursor = 'crosshair';
  return handle;
}

export function linkSelectionOverlay(document: Document, primary: SVGPathElement, id: string): SVGGElement {
  const group = selectionOverlayGroup(document, id, primary);
  const length = primary.getTotalLength();
  group.append(
    linkHalo(document, primary),
    endpointHandle(document, primary, 0, 'from'),
    endpointHandle(document, primary, length, 'to'),
  );
  return group;
}
