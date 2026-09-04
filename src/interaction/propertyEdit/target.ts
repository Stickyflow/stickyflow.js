import { resolveOwner } from '../../domContract';
import type { OwnerRef } from '../../viewer';
import { type EditableRules, isEditablePath } from './editable';

export interface PropertyTarget {
  owner: OwnerRef;
  path: string;
  node: SVGGraphicsElement;
}

export function isTextProperty(node: Element): boolean {
  return node.tagName.toLowerCase() === 'text';
}

export function resolvePropertyTarget(event: MouseEvent, rules: EditableRules | undefined): PropertyTarget | null {
  const node = (event.target as Element | null)?.closest?.('[data-sf-prop]') as SVGGraphicsElement | null;
  if (!node || !isTextProperty(node)) {
    return null;
  }

  const path = node.getAttribute('data-sf-prop');
  const owner = resolveOwner(node);
  if (!path || !owner || !isEditablePath(path, rules)) {
    return null;
  }
  return { owner, path, node };
}
