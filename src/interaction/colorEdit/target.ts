import { resolveOwner } from '../../domContract';
import type { OwnerRef } from '../../viewer';
import { type EditableRules, isEditablePath } from '../propertyEdit/editable';

export interface ColorEditTarget {
  owner: OwnerRef;
  path: string;
  node: SVGGraphicsElement;
  solidOnly: boolean;
}

function resolveTarget(
  event: Event,
  selector: string,
  pathOf: (node: SVGGraphicsElement) => string | null,
  rules: EditableRules | undefined,
): ColorEditTarget | null {
  const node = (event.target as Element | null)?.closest?.(selector) as SVGGraphicsElement | null;
  if (!node) {
    return null;
  }

  const path = pathOf(node);
  const owner = resolveOwner(node);
  if (!path || !owner || !isEditablePath(path, rules)) {
    return null;
  }
  const solidOnly = node.getAttribute('data-sf-prop-solid-only') === 'true';
  return { owner, path, node, solidOnly };
}

export function resolveColorEditTarget(event: Event, rules: EditableRules | undefined): ColorEditTarget | null {
  return resolveTarget(event, '[data-sf-prop-kind="color"]', node => node.getAttribute('data-sf-prop'), rules);
}

export function resolveBarColorEditTarget(event: Event, rules: EditableRules | undefined): ColorEditTarget | null {
  return resolveTarget(event, '[data-sf-color-prop]', node => node.getAttribute('data-sf-color-prop'), rules);
}
