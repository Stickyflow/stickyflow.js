import type { OwnerRef, Viewer } from '../../viewer';

export function selectedMoveGroup(viewer: Viewer, owner: OwnerRef): OwnerRef[] {
  const selection = viewer.getSelection();
  return selection.some(selected => selected.id === owner.id)
    ? selection.filter(selected => selected.role === 'entity')
    : [owner];
}
