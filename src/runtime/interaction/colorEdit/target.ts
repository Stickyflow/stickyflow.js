import { resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { type EditableRules, isEditablePath } from '../propertyEdit/editable';

export interface ColorEditTarget {
  owner: OwnerRef;
  path: string;
  node: SVGGraphicsElement;
  solidOnly: boolean;
}

// Isometric faces are also the object's own clickable body (unlike a chart
// legend swatch, which is nothing else) - opening the color picker on the
// very first click would fight with simply selecting or dragging the cube.
// Gated to a second click, once it's already selected, so the first click
// always just selects it. Selection itself happens synchronously on
// pointerdown (before the 'click' this resolver runs on even fires), so
// checking the live DOM at click time would always see the object as
// "already selected" - even one a first click just selected it. Comparing
// against a snapshot taken at pointerdown, before that selection happened,
// tells the two cases apart.
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
