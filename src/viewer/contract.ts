// Pure helpers for the interactive DOM contract (ADR-03). No DOM globals: owner
// resolution is typed against a minimal element interface so it is node-testable
// and also satisfied structurally by a real SVG Element.
import { DOM_CONTRACT_VERSION, type SceneRole } from '../rendering/renderScene';
import type { OwnerRef } from './events';

/** Structural subset of DOM Element used for owner resolution. */
export interface AttrElement {
  getAttribute(name: string): string | null;
  closest(selector: string): AttrElement | null;
}

/**
 * Whether a pointer/wheel event is asking to drive the CAMERA rather than the
 * content — Ctrl/Cmd held. Defined here, in the tier that owns the camera, so
 * both sides of the rule read from one place: the viewer treats it as pan/zoom,
 * and every mutating gesture in `stickyflow/interaction` (move, resize, link
 * reconnect, quick-duplicate) declines when it is set.
 *
 * Without that second half, panning was impossible the moment shapes filled the
 * viewport: the camera only panned when a drag STARTED on empty canvas, and any
 * drag starting on a shape became a move instead — so the more you zoomed in,
 * the less of the diagram you could reach.
 */
export function isCameraGesture(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey;
}

/** Read the versioned handshake the renderer stamped on the root <svg>. */
export function parseContractVersion(svg: string): number | null {
  const match = /data-sf-contract="(\d+)"/.exec(svg);
  return match ? Number(match[1]) : null;
}

/** A viewer must refuse an svg whose contract it does not understand (ADR-03). */
export function isContractCompatible(version: number | null): boolean {
  return version === DOM_CONTRACT_VERSION;
}

// Every SceneRole the renderer can emit (see renderScene.ts) — anything left
// out here resolves to null, which silently makes that whole family
// unclickable, unselectable and undraggable. `chart` and `path` were both
// missing: a chart's own nodes carry data-sf-role="chart", so every gesture
// over one, including the value drag in interaction/chartValueDrag.ts,
// bailed out before it started.
const ROLES: ReadonlySet<string> = new Set(['entity', 'link', 'frame', 'swimlane', 'table', 'chart', 'path']);

/**
 * Resolve the owner of a clicked/hovered node by walking up to the nearest
 * `[data-sf-id]`. Returns null for chrome (background, defs) with no owner.
 */
export function resolveOwner(target: AttrElement | null): OwnerRef | null {
  const el = target?.closest('[data-sf-id]');
  if (!el) return null;
  const id = el.getAttribute('data-sf-id');
  const role = el.getAttribute('data-sf-role');
  if (!id || !role || !ROLES.has(role)) return null;
  return {
    role: role as SceneRole,
    id,
    kind: el.getAttribute('data-sf-kind') ?? undefined,
    label: el.getAttribute('aria-label') ?? undefined,
  };
}
