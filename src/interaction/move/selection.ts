import { resolveOwner } from '../../domContract';
import type { OwnerRef, Viewer } from '../../viewer';
import { hasEditableGeometry } from '../geometryRoles';

const CONTAINER_ROLES: ReadonlySet<string> = new Set(['frame', 'swimlane']);

function containedChildren(viewer: Viewer, owner: OwnerRef): OwnerRef[] {
  if (!CONTAINER_ROLES.has(owner.role)) {
    return [];
  }
  const nodes = viewer.svg.querySelectorAll(`[data-sf-parent-frame="${CSS.escape(owner.id)}"]`);
  return [...nodes].map(node => resolveOwner(node)).filter((ref): ref is OwnerRef => ref !== null);
}

export function selectedMoveGroup(viewer: Viewer, owner: OwnerRef): OwnerRef[] {
  const selection = viewer.getSelection();
  const isMultiSelect = selection.length > 1 && selection.some(selected => selected.id === owner.id);
  if (isMultiSelect) {
    return selection.filter(hasEditableGeometry);
  }
  return [owner, ...containedChildren(viewer, owner)];
}
