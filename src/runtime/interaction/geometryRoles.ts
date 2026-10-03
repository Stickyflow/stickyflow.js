import { DERIVED_HEIGHT_ROLES } from '../dom';
import type { OwnerRef } from '../viewer';

// 'isometric' only needs to be here for hasMovableGeometry below (dragging
// the body to move it) - its resize handles are a separate, dedicated
// session (see isometricAxisResize/) that bypasses the generic resize
// pipeline entirely, so it was deliberately left out of COMPOSITE_ROLES.
const GEOMETRY_ROLES: ReadonlySet<string> = new Set(['shape', 'chart', 'frame', 'swimlane', 'table', 'isometric']);
const COMPOSITE_ROLES: ReadonlySet<string> = new Set(['chart', 'table']);
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
