import { resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { type EditableRules, isEditablePath } from '../propertyEdit/editable';

export interface ColorEditTarget {
  owner: OwnerRef;
  path: string;
  node: SVGGraphicsElement;
  solidOnly: boolean;
}

let selectedBeforeGesture: ReadonlySet<string> = new Set();

export function snapshotSelectionBeforeGesture(svg: SVGSVGElement): void {
  selectedBeforeGesture = new Set(
    [...svg.querySelectorAll('[data-sf-selection-overlay]')].map(
      el => el.getAttribute('data-sf-selection-overlay') ?? '',
    ),
  );
}

function requiresPriorSelection(node: SVGGraphicsElement, owner: { id: string }): boolean {
  if (node.getAttribute('data-sf-role') !== 'isometric') {
    return false;
  }
  return !selectedBeforeGesture.has(owner.id);
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
  if (!path || !owner || !isEditablePath(path, rules) || requiresPriorSelection(node, owner)) {
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
