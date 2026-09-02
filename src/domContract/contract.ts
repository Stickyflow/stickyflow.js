import { DOM_CONTRACT_VERSION } from '../model/domContractVersion';
import type { SceneRole } from '../rendering/scene';
import type { OwnerRef } from './types';

export interface AttrElement {
  getAttribute(name: string): string | null;
  closest(selector: string): AttrElement | null;
}

export function isCameraGesture(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey;
}

export function parseContractVersion(svg: string): number | null {
  const match = /data-sf-contract="(\d+)"/.exec(svg);
  return match ? Number(match[1]) : null;
}

export function isContractCompatible(version: number | null): boolean {
  return version === DOM_CONTRACT_VERSION;
}

const ROLES: ReadonlySet<string> = new Set(['entity', 'link', 'frame', 'swimlane', 'table', 'chart', 'path']);

export function resolveOwner(target: AttrElement | null): OwnerRef | null {
  const el = target?.closest('[data-sf-id]');
  if (!el) {
    return null;
  }
  const id = el.getAttribute('data-sf-id');
  const role = el.getAttribute('data-sf-role');
  if (!id || !role || !ROLES.has(role)) {
    return null;
  }
  return {
    role: role as SceneRole,
    id,
    kind: el.getAttribute('data-sf-kind') ?? undefined,
    label: el.getAttribute('aria-label') ?? undefined,
  };
}
