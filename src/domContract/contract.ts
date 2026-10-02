import type { SceneRole } from '../renderScene/scene';
import { PATH_CLOSED_ATTR, PATH_POINTS_ATTR, PATH_TENSION_ATTR, SYMBOL_BOUNDS_ATTR } from '../svgContract/attributes';
import { DOM_CONTRACT_VERSION } from '../svgContract/version';
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

export function symbolDeclaredBounds(el: {
  getAttribute(name: string): string | null;
}): { x: number; y: number; width: number; height: number } | null {
  const raw = el.getAttribute(SYMBOL_BOUNDS_ATTR);
  if (!raw) {
    return null;
  }
  const [x, y, width, height] = raw.split(',').map(Number);
  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height)
    ? { x, y, width, height }
    : null;
}

export interface PathGeometry {
  points: Array<[number, number]>;
  tension: number;
  closed: boolean;
}

export function pathGeometryOf(el: { getAttribute(name: string): string | null }): PathGeometry | null {
  const raw = el.getAttribute(PATH_POINTS_ATTR);
  if (!raw) {
    return null;
  }
  let points: unknown;
  try {
    points = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(points) || !points.every(point => Array.isArray(point) && point.length === 2)) {
    return null;
  }
  return {
    points: points as Array<[number, number]>,
    tension: Number(el.getAttribute(PATH_TENSION_ATTR)) || 0,
    closed: el.getAttribute(PATH_CLOSED_ATTR) === 'true',
  };
}

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
