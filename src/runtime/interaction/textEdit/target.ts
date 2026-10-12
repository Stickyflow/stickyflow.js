import { resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';

const EDITABLE_ROLES = new Set(['shape', 'link', 'isometric']);

function isFrameTitle(target: Element | null): boolean {
  return Boolean(target?.closest('text, [id*="frame-tab-"]'));
}

export function resolveEditableTextOwner(event: MouseEvent): OwnerRef | null {
  const target = event.target as Element | null;
  const owner = resolveOwner(target);
  if (!owner) {
    return null;
  }
  if (owner.role === 'frame') {
    return isFrameTitle(target) ? owner : null;
  }
  return EDITABLE_ROLES.has(owner.role) ? owner : null;
}
