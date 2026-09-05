import type { OwnerRef, Viewer } from '../../viewer';
import { hasEditableGeometry } from '../geometryRoles';

export function selectedMoveGroup(viewer: Viewer, owner: OwnerRef): OwnerRef[] {
  const selection = viewer.getSelection();
  return selection.some(selected => selected.id === owner.id) ? selection.filter(hasEditableGeometry) : [owner];
}
