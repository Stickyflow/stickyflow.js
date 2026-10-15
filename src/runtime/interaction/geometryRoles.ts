import { DERIVED_HEIGHT_ROLES } from '../dom';
import type { OwnerRef } from '../viewer';

const GEOMETRY_ROLES: ReadonlySet<string> = new Set(['shape', 'chart', 'frame', 'swimlane', 'isometric', 'widget']);
const COMPOSITE_ROLES: ReadonlySet<string> = new Set(['chart']);
const MOVABLE_ROLES: ReadonlySet<string> = new Set([...GEOMETRY_ROLES, 'path']);

export function hasEditableGeometry(owner: OwnerRef | null | undefined): owner is OwnerRef {
  return owner !== null && owner !== undefined && GEOMETRY_ROLES.has(owner.role);
}

export function hasMovableGeometry(owner: OwnerRef | null | undefined): owner is OwnerRef {
  return owner !== null && owner !== undefined && MOVABLE_ROLES.has(owner.role);
}

export function isCompositeOwner(owner: OwnerRef | null | undefined): boolean {
  return owner !== null && owner !== undefined && COMPOSITE_ROLES.has(owner.role);
}

export function hasDerivedHeight(owner: OwnerRef | null | undefined): boolean {
  return owner !== null && owner !== undefined && DERIVED_HEIGHT_ROLES.has(owner.role);
}
