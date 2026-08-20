// Package-owned alignment-guide overlay for live drag/resize snapping. Real
// SVG <line> elements appended as a top-level child of the root <svg>, same
// convention as selectionOverlay.ts — a <g data-sf-alignment-guides> group.
// Unlike the selection ring (patched in place for perf), this group is fully
// removed and rebuilt on every pointermove: guides only ever exist during a
// live drag, so there's no steady-state cost to amortize.
//
// Called from `stickyflow/interaction`'s moveDrag.ts / resizeDrag.ts pointer
// handlers — see src/interaction/snapGeometry.ts for where GuideLine values
// are computed. viewer/ never imports from interaction/ (one-way layering),
// which is why GuideLine is defined here and imported by snapGeometry.ts,
// not the other way around.
const NS = 'http://www.w3.org/2000/svg';
const DASH = '8 4';

export interface GuideLine {
  /** 'vertical' = a constant-x line (an aligned left/right/center-X match);
   *  'horizontal' = a constant-y line (top/bottom/center-Y match). */
  orientation: 'vertical' | 'horizontal';
  /** World-space coordinate of the line along its own axis. */
  position: number;
  /** World-space extent of the line on the perpendicular axis. */
  from: number;
  to: number;
}

function el<K extends keyof SVGElementTagNameMap>(doc: Document, tag: K): SVGElementTagNameMap[K] {
  return doc.createElementNS(NS, tag) as SVGElementTagNameMap[K];
}

/** Replace whatever alignment-guide group currently exists with one drawing
 *  `guides` in `color`. Pass an empty array to just clear. */
export function updateAlignmentGuides(svg: SVGSVGElement, guides: GuideLine[], color: string): void {
  svg.querySelectorAll('[data-sf-alignment-guides]').forEach(g => g.remove());
  if (!guides.length) return;
  const doc = svg.ownerDocument;
  const g = el(doc, 'g');
  g.setAttribute('data-sf-alignment-guides', '');
  g.setAttribute('pointer-events', 'none');
  guides.forEach(guide => {
    const line = el(doc, 'line');
    if (guide.orientation === 'vertical') {
      line.setAttribute('x1', String(guide.position));
      line.setAttribute('x2', String(guide.position));
      line.setAttribute('y1', String(guide.from));
      line.setAttribute('y2', String(guide.to));
    } else {
      line.setAttribute('y1', String(guide.position));
      line.setAttribute('y2', String(guide.position));
      line.setAttribute('x1', String(guide.from));
      line.setAttribute('x2', String(guide.to));
    }
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1');
    line.setAttribute('stroke-dasharray', DASH);
    line.setAttribute('opacity', '0.8');
    // Keeps stroke width AND dash pattern visually constant on screen
    // regardless of the current viewBox zoom, without computing a scale
    // factor by hand the way the snap THRESHOLD itself must (see
    // domQuery.ts's pxPerUnit) — a genuine distance comparison can't dodge
    // that, but a line's own paint can, via this SVG-native attribute.
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    g.appendChild(line);
  });
  svg.appendChild(g);
}

export function clearAlignmentGuides(svg: SVGSVGElement): void {
  svg.querySelectorAll('[data-sf-alignment-guides]').forEach(g => g.remove());
}
