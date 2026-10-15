import { svgElement } from './selectionOverlay/dom';

const OVERLAY_ATTR = 'data-sf-change-overlay';

export const CHANGE_COLOR = '#f59e0b';

export const FLASH_DURATION_MS = 1300;

export const REDUCED_MOTION_DURATION_MS = 400;

function changeOverlayGroup(document: Document, id: string, primary: SVGGraphicsElement): SVGGElement {
  const group = svgElement(document, 'g');
  group.setAttribute(OVERLAY_ATTR, id);
  group.setAttribute('pointer-events', 'none');
  const transform = primary.getAttribute('transform');
  if (transform) {
    group.setAttribute('transform', transform);
  }
  return group;
}

export function startChangeFade(target: SVGGElement, reducedMotion: boolean): void {
  if (reducedMotion) {
    return;
  }
  target.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: FLASH_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
}

export function shapeChangeOverlay(
  document: Document,
  primary: SVGGraphicsElement,
  id: string,
  color: string = CHANGE_COLOR,
): SVGGElement {
  const bounds = primary.getBBox();
  const group = changeOverlayGroup(document, id, primary);
  const ring = svgElement(document, 'rect');
  ring.setAttribute('x', String(bounds.x - 4));
  ring.setAttribute('y', String(bounds.y - 4));
  ring.setAttribute('width', String(bounds.width + 8));
  ring.setAttribute('height', String(bounds.height + 8));
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', color);
  ring.setAttribute('stroke-width', '3');
  group.appendChild(ring);
  return group;
}

export function linkChangeOverlay(
  document: Document,
  primary: SVGPathElement,
  id: string,
  color: string = CHANGE_COLOR,
): SVGGElement {
  const group = changeOverlayGroup(document, id, primary);
  const halo = svgElement(document, 'path');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', color);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + 6));
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('opacity', '0.6');
  group.appendChild(halo);
  return group;
}
