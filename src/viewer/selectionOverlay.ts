// Package-owned selection indicator — the viewer draws this itself as real
// SVG, instead of a `data-sf-selected` attribute plus a host-supplied CSS rule
// (the previous mechanism: it only worked if a host happened to ship a
// matching stylesheet, and recolored the shape's own stroke rather than
// showing a separate indicator). Geometry mirrors the real app's actual
// selection UI (ShapeSelectionIndicator.tsx): a ring offset 1px outside the
// shape's bbox plus four corner handle squares — never a change to the
// shape's own paint. Links get a purple halo along their own path plus small
// endpoint dots instead of a bbox ring, since a link's bbox spans its whole
// route, not a meaningful "selected" box.
const NS = 'http://www.w3.org/2000/svg';
const RING_COLOR = '#9b42df';
const HANDLE_STROKE = '#992dff';
const HANDLE_SIZE = 6;

export type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

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

/** Ring + corner handles around a shape/frame/table/swimlane's own bbox. */
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

  const corners: Array<[number, number, ResizeHandle, string]> = [
    [bbox.x, bbox.y, 'top-left', 'nwse-resize'],
    [bbox.x + bbox.width, bbox.y, 'top-right', 'nesw-resize'],
    [bbox.x, bbox.y + bbox.height, 'bottom-left', 'nesw-resize'],
    [bbox.x + bbox.width, bbox.y + bbox.height, 'bottom-right', 'nwse-resize'],
  ];
  for (const [cx, cy, name, cursor] of corners) {
    const handle = el(doc, 'rect');
    handle.setAttribute('x', String(cx - HANDLE_SIZE / 2));
    handle.setAttribute('y', String(cy - HANDLE_SIZE / 2));
    handle.setAttribute('width', String(HANDLE_SIZE));
    handle.setAttribute('height', String(HANDLE_SIZE));
    handle.setAttribute('fill', 'white');
    handle.setAttribute('stroke', HANDLE_STROKE);
    handle.setAttribute('stroke-width', '1');
    // The overlay group turns pointer-events off (so the ring never steals
    // clicks meant for the shape underneath) — handles opt back in, and
    // `stickyflow/interaction`'s resizeDrag.ts looks for exactly this
    // attribute to tell a resize-handle grab apart from a body drag.
    handle.setAttribute('data-sf-resize-handle', name);
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = cursor;
    g.appendChild(handle);
  }
  return g;
}

/** Purple halo along a link's own path, plus small dots at its two endpoints. */
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
  for (const point of [primary.getPointAtLength(0), primary.getPointAtLength(length)]) {
    const dot = el(doc, 'circle');
    dot.setAttribute('cx', String(point.x));
    dot.setAttribute('cy', String(point.y));
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', RING_COLOR);
    g.appendChild(dot);
  }
  return g;
}
