import { resolveOwner } from '../../domContract';
import type { OwnerRef } from '../../viewer';
import { type EditableRules, isEditablePath } from '../propertyEdit/editable';

export interface ColorEditTarget {
  owner: OwnerRef;
  path: string;
  node: SVGGraphicsElement;
}

export function resolveColorEditTarget(event: MouseEvent, rules: EditableRules | undefined): ColorEditTarget | null {
  const node = (event.target as Element | null)?.closest?.('[data-sf-prop-kind="color"]') as SVGGraphicsElement | null;
  if (!node) {
    return null;
  }

  const path = node.getAttribute('data-sf-prop');
  const owner = resolveOwner(node);
  if (!path || !owner || !isEditablePath(path, rules)) {
    return null;
  }
  return { owner, path, node };
}
