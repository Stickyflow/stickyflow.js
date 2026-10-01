// Package-owned "this just changed" indicator — real appended SVG, same
// philosophy as selectionOverlay/shape.ts: drawn by the package itself rather
// than a `data-sf-*` attribute plus a host-supplied CSS rule (which only works
// if a host happens to ship a matching stylesheet). The fade uses the Web
// Animations API (Element.animate()), not CSS and not SMIL:
//   - Not CSS: a stylesheet-driven transition would need `style-src
//     'unsafe-inline'` or a nonce in every embedding context this package
//     ends up in.
//   - Not SMIL (<animate>): verified via direct DOM inspection (computed
//     opacity read back at t=0 and t=+150ms) that a `dur="1.3s"` SMIL
//     animation reliably hit opacity 0 by ~150ms — about 8x faster than
//     specified — inside a VS Code webview's sandboxed iframe, while identical
//     markup faded correctly over the full 1.3s in a plain browser tab. WAAPI
//     sidesteps it by not depending on the browser's SMIL implementation,
//     while keeping the same CSP-safety property (a JS `.animate()` call is
//     not gated by `style-src` the way a stylesheet-driven transition is).
//
// Deliberately a distinct color and a wider offset than the selection ring
// (RING_COLOR '#9b42df', +1px in selectionOverlay/shape.ts) so a shape that is
// simultaneously selected and just-changed shows both rings distinctly rather
// than one obscuring the other.
import { svgElement } from './selectionOverlay/dom';

const OVERLAY_ATTR = 'data-sf-change-overlay';

/** Default ring/halo color — overridable per call (see the change-flash
 *  binding in viewer/interaction) so a host can distinguish categories of
 *  external change, e.g. a likely human edit vs. a bulk/tool-driven rewrite. */
export const CHANGE_COLOR = '#f59e0b';

/** Fade duration when motion is allowed. */
export const FLASH_DURATION_MS = 1300;

/** How long the (unanimated) ring stays visible when the reader has
 *  prefers-reduced-motion set — still shown-then-removed, just without the
 *  animated fade, so the change is never silently invisible for that
 *  preference. */
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

/** Starts the fade — called by the change-flash binding only AFTER the overlay
 *  group is connected to the live svg (not from inside the builders below,
 *  while the group is still a detached node), so the animation timeline never
 *  starts before its target is part of the rendered document. */
export function startChangeFade(target: SVGGElement, reducedMotion: boolean): void {
  if (reducedMotion) {
    return; // the caller's own timer removes the group instead
  }
  target.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: FLASH_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
}

/** Ring around a shape/frame/table/swimlane's own bbox — no corner handles
 *  (those are a selection-only resize affordance). The caller starts the fade
 *  itself, after appending — see startChangeFade. */
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

/** Halo along a link's own path — no endpoint dots (a selection-only
 *  reconnect affordance). The caller starts the fade itself, after appending
 *  — see startChangeFade. */
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
