// Package-owned "this just changed" indicator — real appended SVG, same
// philosophy as selectionOverlay.ts (drawn by the package itself rather than
// a `data-sf-*` attribute plus a host-supplied CSS rule, which only works if
// a host happens to ship a matching stylesheet). The fade is done via the
// Web Animations API (Element.animate()), not CSS and not SMIL:
//   - Not CSS: a stylesheet-driven transition would need `style-src
//     'unsafe-inline'` or a nonce in every embedding context this package
//     ends up in, not just one specific host.
//   - Not SMIL (<animate>), despite that being the original choice here:
//     verified via direct DOM inspection (computed opacity read back at t=0
//     and t=+150ms) that a `dur="1.3s"` SMIL animation reliably hit opacity
//     0 by ~150ms — about 8x faster than specified — inside a VS Code
//     webview's sandboxed iframe, while the identical markup faded correctly
//     over the full 1.3s in a plain browser tab. Root cause not fully
//     isolated (SMIL's declarative timeline behaving oddly in that specific
//     sandboxed-iframe embedding is the leading theory), but WAAPI sidesteps
//     it entirely by not depending on the browser's own SMIL implementation,
//     while keeping the same CSP-safety property SMIL was chosen for — a
//     JS-driven `.animate()` call isn't gated by `style-src` the way a
//     stylesheet-driven transition would be.
//
// Deliberately a distinct color and a wider offset than the selection ring
// (RING_COLOR '#9b42df', +1px in selectionOverlay.ts) so a shape that is
// simultaneously selected and just-changed shows both rings distinctly
// rather than one obscuring the other.
import { el, overlayGroup } from './selectionOverlay';

const ATTR = 'data-sf-change-overlay';
/** Default ring/halo color — overridable per call (see flashChanged in
 *  interaction.ts) so a host can distinguish categories of external change,
 *  e.g. "likely a human edit" vs. "likely a bulk/tool-driven rewrite". */
export const CHANGE_COLOR = '#f59e0b';

/** Fade duration when motion is allowed. */
export const FLASH_DUR_MS = 1300;
/** How long the (unanimated) ring stays visible when the reader has
 *  prefers-reduced-motion set — still shown-then-removed, just without the
 *  animated fade, so the change is never silently invisible for that
 *  preference. */
export const REDUCED_MOTION_DUR_MS = 400;

/** Starts the fade — called by interaction.ts's flashChanged only AFTER the
 *  overlay group is actually connected to the live `svg` (not from inside
 *  shapeChangeOverlay/linkChangeOverlay below, while `g` is still a detached
 *  node), so there's no ambiguity about the animation timeline starting
 *  before the element it targets is part of the rendered document. */
export function startFade(target: SVGGElement, reducedMotion: boolean): void {
  if (reducedMotion) return; // caller's own timer removes the group instead — see interaction.ts's flashChanged
  target.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLASH_DUR_MS, easing: 'linear', fill: 'forwards' });
}

/** Ring around a shape/frame/table/swimlane's own bbox — no corner handles
 *  (those are a selection-only resize affordance, not applicable here).
 *  Caller (flashChanged) starts the fade itself, after appending — see
 *  startFade's own doc comment for why. */
export function shapeChangeOverlay(doc: Document, primary: SVGGraphicsElement, id: string, color: string = CHANGE_COLOR): SVGGElement {
  const bbox = primary.getBBox();
  const g = overlayGroup(doc, ATTR, id, primary);

  const ring = el(doc, 'rect');
  ring.setAttribute('x', String(bbox.x - 4));
  ring.setAttribute('y', String(bbox.y - 4));
  ring.setAttribute('width', String(bbox.width + 8));
  ring.setAttribute('height', String(bbox.height + 8));
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', color);
  ring.setAttribute('stroke-width', '3');
  g.appendChild(ring);

  return g;
}

/** Halo along a link's own path — no endpoint dots (also a selection-only
 *  reconnect affordance). Caller (flashChanged) starts the fade itself,
 *  after appending — see startFade's own doc comment for why. */
export function linkChangeOverlay(doc: Document, primary: SVGPathElement, id: string, color: string = CHANGE_COLOR): SVGGElement {
  const g = overlayGroup(doc, ATTR, id, primary);

  const halo = el(doc, 'path');
  halo.setAttribute('d', primary.getAttribute('d') ?? '');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', color);
  const baseWidth = Number(primary.getAttribute('stroke-width')) || 2;
  halo.setAttribute('stroke-width', String(baseWidth + 6));
  halo.setAttribute('stroke-linecap', 'round');
  halo.setAttribute('opacity', '0.6');
  g.appendChild(halo);

  return g;
}
