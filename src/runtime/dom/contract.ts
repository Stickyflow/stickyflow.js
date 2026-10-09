import type { SceneRole } from '../../renderScene/scene';
import {
  CORNER_RADIUS_ATTR,
  ISOMETRIC_LABEL_OFFSET_ATTR,
  ISOMETRIC_SIZE_ATTR,
  PATH_CLOSED_ATTR,
  PATH_POINTS_ATTR,
  PATH_TENSION_ATTR,
  SYMBOL_BOUNDS_ATTR,
} from '../../svg/domContract/attributes';
import { DOM_CONTRACT_VERSION } from '../../svg/domContract/version';
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

const ROLES: ReadonlySet<string> = new Set(['entity', 'link', 'frame', 'swimlane', 'chart', 'path', 'isometric']);

function sceneRole(domRole: string): SceneRole {
  return domRole === 'entity' ? 'shape' : (domRole as SceneRole);
}

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

export interface IsometricGeometry {
  width: number;
  height: number;
  depth: number;
  cornerRadius: number;
  bounds: { x: number; y: number; width: number; height: number } | null;
  labelOffsetX: number;
  labelOffsetY: number;
}

export function isometricGeometryOf(el: { getAttribute(name: string): string | null }): IsometricGeometry | null {
  const raw = el.getAttribute(ISOMETRIC_SIZE_ATTR);
  if (raw === null) {
    return null;
  }
  const [width, height, depth] = raw.split(',').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(depth)) {
    return null;
  }
  const cornerRadius = Number(el.getAttribute(CORNER_RADIUS_ATTR)) || 0;
  const [labelOffsetX, labelOffsetY] = (el.getAttribute(ISOMETRIC_LABEL_OFFSET_ATTR) ?? '0,0').split(',').map(Number);
  return {
    width,
    height,
    depth,
    cornerRadius,
    bounds: symbolDeclaredBounds(el),
    labelOffsetX: Number.isFinite(labelOffsetX) ? labelOffsetX : 0,
    labelOffsetY: Number.isFinite(labelOffsetY) ? labelOffsetY : 0,
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
    role: sceneRole(role),
    id,
    kind: el.getAttribute('data-sf-kind') ?? undefined,
    label: el.getAttribute('aria-label') ?? undefined,
  };
}
