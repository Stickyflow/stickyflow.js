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
const BUBBLE_RADIUS = 8;
const BUBBLE_OFFSET = BUBBLE_RADIUS + 15; // 23 — matches the interactive canvas app's own spacing

export type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type LinkEndpoint = 'from' | 'to';
export type QuickDuplicateDirection = 'top' | 'right' | 'bottom' | 'left';

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

/**
 * Four small "quick duplicate" dots centered on each side of a SINGLY
 * selected entity's bbox, offset outside it — click one to create a copy of
 * the entity in that direction, auto-connected with a link (see
 * `stickyflow/interaction`'s quickDuplicate.ts). Matches the interactive
 * canvas app's own spacing (8px radius, 23px offset) and, deliberately
 * simpler than that app's version, has no separate hover-highlight state or
 * click-vs-drag timing window: no other overlay element in this package
 * changes appearance on hover (resize handles/link endpoints only change the
 * cursor), and there's no "drag a bubble to an existing entity to just link
 * them" gesture here — only the duplicate-and-link click.
 */
/** Bubble centers for a given bbox — shared with resizeDrag.ts's live
 *  reposition (see updateQuickDuplicateBubbles) so both places compute the
 *  exact same four points from a set of bounds. */
function quickDuplicatePositions(bbox: { x: number; y: number; width: number; height: number }): Array<[number, number, QuickDuplicateDirection]> {
  const cx = bbox.x + bbox.width / 2, cy = bbox.y + bbox.height / 2;
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
    // Same opt-back-into-pointer-events pattern as resize handles/link
    // endpoints above — quickDuplicate.ts looks for this attribute.
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

/** Live-reposition an existing quickDuplicateBubbles() group at a new bbox —
 *  used by resizeDrag.ts so the bubbles track a shape's live-resized bounds
 *  instead of only jumping to the new spot once the drag ends and the whole
 *  selection overlay is repainted from scratch. Zips positions to circles by
 *  index rather than by direction: insertion order in quickDuplicateBubbles()
 *  above is always top/right/bottom/left, so it's stable, and a circle's own
 *  very next sibling is always its plus icon (the two are appended as a pair
 *  above) — no need to re-derive the pairing by attribute matching. */
export function updateQuickDuplicateBubbles(g: SVGGElement, bbox: { x: number; y: number; width: number; height: number }): void {
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
  const ends: Array<[number, LinkEndpoint]> = [[0, 'from'], [length, 'to']];
  for (const [atLength, end] of ends) {
    const point = primary.getPointAtLength(atLength);
    const dot = el(doc, 'circle');
    dot.setAttribute('cx', String(point.x));
    dot.setAttribute('cy', String(point.y));
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', RING_COLOR);
    dot.setAttribute('stroke', 'white');
    dot.setAttribute('stroke-width', '1.5');
    // Same opt-back-into-pointer-events pattern as the resize handles above —
    // `stickyflow/interaction`'s linkEndpointDrag.ts looks for this attribute
    // to tell an endpoint-reconnect grab apart from selecting the link itself.
    dot.setAttribute('data-sf-link-endpoint', end);
    dot.style.pointerEvents = 'auto';
    dot.style.cursor = 'crosshair';
    g.appendChild(dot);
  }
  return g;
}
