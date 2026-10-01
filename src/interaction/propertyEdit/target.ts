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

function textNodeForPath(hit: SVGGraphicsElement, path: string, ownerId: string): SVGGraphicsElement | null {
  const selector = `text[data-sf-prop="${CSS.escape(path)}"][data-sf-id="${CSS.escape(ownerId)}"]`;
  const root: ParentNode | null = hit.ownerSVGElement ?? hit.ownerDocument;
  return root?.querySelector<SVGGraphicsElement>(selector) ?? null;
}

export function resolvePropertyTarget(event: MouseEvent, rules: EditableRules | undefined): PropertyTarget | null {
  const hit = (event.target as Element | null)?.closest?.('[data-sf-prop]') as SVGGraphicsElement | null;
  if (!hit) {
    return null;
  }

  const path = hit.getAttribute('data-sf-prop');
  const owner = resolveOwner(hit);
  if (!path || !owner || !isEditablePath(path, rules)) {
    return null;
  }

  if (!isTextProperty(hit) && hit.getAttribute('data-sf-prop-kind') !== 'value') {
    return null;
  }

  const node = isTextProperty(hit) ? hit : textNodeForPath(hit, path, owner.id);
  if (!node) {
    return null;
  }
  return { owner, path, node };
}
