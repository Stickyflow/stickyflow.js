// Package-owned "this just changed" indicator — real appended SVG, same
// philosophy as selectionOverlay.ts (drawn by the package itself rather than
// a `data-sf-*` attribute plus a host-supplied CSS rule, which only works if
// a host happens to ship a matching stylesheet). The fade is SMIL
// (<animate>), not CSS, for the same reason: SMIL isn't gated by any CSP
// directive (unlike a <style>-driven transition, which would need
// `style-src 'unsafe-inline'` or a nonce in every embedding context this
// package ends up in, not just one specific host).
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

function appendFade(doc: Document, target: SVGGElement, reducedMotion: boolean): void {
  if (reducedMotion) return; // caller's own timer removes the group instead — see interaction.ts's flashChanged
  const anim = doc.createElementNS('http://www.w3.org/2000/svg', 'animate');
  anim.setAttribute('attributeName', 'opacity');
  anim.setAttribute('from', '1');
  anim.setAttribute('to', '0');
  anim.setAttribute('dur', `${FLASH_DUR_MS / 1000}s`);
  anim.setAttribute('fill', 'freeze');
  target.appendChild(anim);
}

/** Ring around a shape/frame/table/swimlane's own bbox — no corner handles
 *  (those are a selection-only resize affordance, not applicable here). */
export function shapeChangeOverlay(doc: Document, primary: SVGGraphicsElement, id: string, reducedMotion: boolean, color: string = CHANGE_COLOR): SVGGElement {
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

  appendFade(doc, g, reducedMotion);
  return g;
}

/** Halo along a link's own path — no endpoint dots (also a selection-only
 *  reconnect affordance). */
export function linkChangeOverlay(doc: Document, primary: SVGPathElement, id: string, reducedMotion: boolean, color: string = CHANGE_COLOR): SVGGElement {
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

  appendFade(doc, g, reducedMotion);
  return g;
}
