import { SVG_NAMESPACE } from './svgNamespace';

const NS = SVG_NAMESPACE;
const RING_COLOR = '#9b42df';
const HANDLE_STROKE = '#992dff';
const HANDLE_SIZE = 6;
const BUBBLE_RADIUS = 8;
const BUBBLE_OFFSET = BUBBLE_RADIUS + 15;

export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';
export type LinkEndpoint = 'from' | 'to';
export type QuickDuplicateDirection = 'top' | 'right' | 'bottom' | 'left';

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  'top-left': 'nwse-resize',
  top: 'ns-resize',
  'top-right': 'nesw-resize',
  right: 'ew-resize',
  'bottom-right': 'nwse-resize',
  bottom: 'ns-resize',
  'bottom-left': 'nesw-resize',
  left: 'ew-resize',
};

export function resizeHandlePositions(bbox: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Array<[number, number, ResizeHandle]> {
  const cx = bbox.x + bbox.width / 2,
    cy = bbox.y + bbox.height / 2;
  return [
    [bbox.x, bbox.y, 'top-left'],
    [cx, bbox.y, 'top'],
    [bbox.x + bbox.width, bbox.y, 'top-right'],
    [bbox.x + bbox.width, cy, 'right'],
    [bbox.x + bbox.width, bbox.y + bbox.height, 'bottom-right'],
    [cx, bbox.y + bbox.height, 'bottom'],
    [bbox.x, bbox.y + bbox.height, 'bottom-left'],
    [bbox.x, cy, 'left'],
  ];
}

function el<K extends keyof SVGElementTagNameMap>(doc: Document, tag: K): SVGElementTagNameMap[K] {
  return doc.createElementNS(NS, tag) as SVGElementTagNameMap[K];
}

function overlayGroup(doc: Document, id: string, copyTransformFrom: SVGGraphicsElement): SVGGElement {
  const g = el(doc, 'g');
  g.setAttribute('data-sf-selection-overlay', id);
  g.setAttribute('pointer-events', 'none');
  const transform = copyTransformFrom.getAttribute('transform');
  if (transform) g.setAttribute('transform', transform);
  return g;
}

export function shapeSelectionOverlay(doc: Document, primary: SVGGraphicsElement, id: string): SVGGElement {
  const bbox = primary.getBBox();
  const g = overlayGroup(doc, id, primary);

  const ring = el(doc, 'rect');
  ring.setAttribute('x', String(bbox.x - 1));
  ring.setAttribute('y', String(bbox.y - 1));
  ring.setAttribute('width', String(bbox.width + 2));
  ring.setAttribute('height', String(bbox.height + 2));
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', RING_COLOR);
  ring.setAttribute('stroke-width', '3');
  g.appendChild(ring);

  for (const [cx, cy, name] of resizeHandlePositions(bbox)) {
    const handle = el(doc, 'rect');
    handle.setAttribute('x', String(cx - HANDLE_SIZE / 2));
    handle.setAttribute('y', String(cy - HANDLE_SIZE / 2));
    handle.setAttribute('width', String(HANDLE_SIZE));
    handle.setAttribute('height', String(HANDLE_SIZE));
    handle.setAttribute('fill', 'white');
    handle.setAttribute('stroke', HANDLE_STROKE);
    handle.setAttribute('stroke-width', '1');
    handle.setAttribute('data-sf-resize-handle', name);
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = HANDLE_CURSORS[name];
    g.appendChild(handle);
  }
  return g;
}

function quickDuplicatePositions(bbox: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Array<[number, number, QuickDuplicateDirection]> {
  const cx = bbox.x + bbox.width / 2,
    cy = bbox.y + bbox.height / 2;
  return [
    [cx, bbox.y - BUBBLE_OFFSET, 'top'],
    [bbox.x + bbox.width + BUBBLE_OFFSET, cy, 'right'],
    [cx, bbox.y + bbox.height + BUBBLE_OFFSET, 'bottom'],
    [bbox.x - BUBBLE_OFFSET, cy, 'left'],
  ];
}

export function quickDuplicateBubbles(doc: Document, primary: SVGGraphicsElement, id: string): SVGGElement {
  const bbox = primary.getBBox();
  const g = overlayGroup(doc, id, primary);
  const positions = quickDuplicatePositions(bbox);
  for (const [bx, by, direction] of positions) {
    const dot = el(doc, 'circle');
    dot.setAttribute('cx', String(bx));
    dot.setAttribute('cy', String(by));
    dot.setAttribute('r', String(BUBBLE_RADIUS));
    dot.setAttribute('fill', '#e8e8e8');
    dot.setAttribute('stroke', '#ccc');
    dot.setAttribute('stroke-width', '1.5');
    dot.setAttribute('data-sf-quick-duplicate', direction);
    dot.style.pointerEvents = 'auto';
    dot.style.cursor = 'pointer';
    g.appendChild(dot);

    const plus = el(doc, 'path');
    const s = 4;
    plus.setAttribute('d', `M ${bx - s} ${by} L ${bx + s} ${by} M ${bx} ${by - s} L ${bx} ${by + s}`);
    plus.setAttribute('stroke', '#999');
    plus.setAttribute('stroke-width', '1.5');
    plus.setAttribute('stroke-linecap', 'round');
    g.appendChild(plus);
  }
  return g;
}

export function updateQuickDuplicateBubbles(
  g: SVGGElement,
  bbox: { x: number; y: number; width: number; height: number },
): void {
  const positions = quickDuplicatePositions(bbox);
  const dots = g.querySelectorAll('circle[data-sf-quick-duplicate]');
  positions.forEach(([bx, by], i) => {
    const dot = dots[i];
    if (!dot) return;
    dot.setAttribute('cx', String(bx));
    dot.setAttribute('cy', String(by));
    const plus = dot.nextElementSibling;
    if (plus) {
      const s = 4;
      plus.setAttribute('d', `M ${bx - s} ${by} L ${bx + s} ${by} M ${bx} ${by - s} L ${bx} ${by + s}`);
    }
  });
}

export function linkSelectionOverlay(doc: Document, primary: SVGPathElement, id: string): SVGGElement {
  const g = overlayGroup(doc, id, primary);

  const halo = el(doc, 'path');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', RING_COLOR);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + 4));
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('opacity', '0.5');
  g.appendChild(halo);

  const length = primary.getTotalLength();
  const ends: Array<[number, LinkEndpoint]> = [
    [0, 'from'],
    [length, 'to'],
  ];
  for (const [atLength, end] of ends) {
    const point = primary.getPointAtLength(atLength);
    const dot = el(doc, 'circle');
    dot.setAttribute('cx', String(point.x));
    dot.setAttribute('cy', String(point.y));
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', RING_COLOR);
    dot.setAttribute('stroke', 'white');
    dot.setAttribute('stroke-width', '1.5');
    dot.setAttribute('data-sf-link-endpoint', end);
    dot.style.pointerEvents = 'auto';
    dot.style.cursor = 'crosshair';
    g.appendChild(dot);
  }
  return g;
}
