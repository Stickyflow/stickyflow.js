import type { OwnerRef } from '../viewer';

const GEOMETRY_ROLES: ReadonlySet<string> = new Set(['entity', 'chart', 'frame', 'swimlane']);

export function hasEditableGeometry(owner: OwnerRef | null | undefined): owner is OwnerRef {
  return owner !== null && owner !== undefined && GEOMETRY_ROLES.has(owner.role);
}

export function isCompositeOwner(owner: OwnerRef | null | undefined): boolean {
  return owner?.role === 'chart';
}
