import { DERIVED_HEIGHT_ROLES } from '../dom';
import type { OwnerRef } from '../viewer';

const GEOMETRY_ROLES: ReadonlySet<string> = new Set(['shape', 'chart', 'frame', 'swimlane', 'table', 'isometric']);
// Isometric has no per-kind live-resize geometry function (unlike the built-in
// shape types applySingleNodeBounds knows how to redraw), so it rides the
// same generic transform-based preview as chart/table: scale+translate every
// node as a rigid group instead of recomputing the isometric faces on every
// pointermove. That also fixes the label specifically - composite mode keeps
// text nodes in geometryNodes (the non-composite path filters them out) and
// translates their anchor without scaling the glyphs, rather than leaving
// them to whatever the non-composite per-kind path did with an unrecognized
// 'isometric' kind.
const COMPOSITE_ROLES: ReadonlySet<string> = new Set(['chart', 'table', 'isometric']);
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
