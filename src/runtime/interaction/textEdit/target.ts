import { resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';

const EDITABLE_ROLES = new Set(['entity', 'link']);

export function resolveEditableTextOwner(event: MouseEvent): OwnerRef | null {
  const owner = resolveOwner(event.target as Element | null);
  if (!owner || !EDITABLE_ROLES.has(owner.role)) {
    return null;
  }

  return owner;
}
