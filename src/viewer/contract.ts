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

/** Read the versioned handshake the renderer stamped on the root <svg>. */
export function parseContractVersion(svg: string): number | null {
  const match = /data-sf-contract="(\d+)"/.exec(svg);
  return match ? Number(match[1]) : null;
}

/** A viewer must refuse an svg whose contract it does not understand (ADR-03). */
export function isContractCompatible(version: number | null): boolean {
  return version === DOM_CONTRACT_VERSION;
}

const ROLES: ReadonlySet<string> = new Set(['entity', 'link', 'frame', 'swimlane', 'table']);

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
