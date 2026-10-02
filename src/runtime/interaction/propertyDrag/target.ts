import { findOwnerNode, isCameraGesture, isPrimary, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { parseValueScale } from '../chartValue/scale';
import type { ValueScale } from '../chartValue/types';
import { type EditableRules, isEditablePath } from '../propertyEdit/editable';

export interface PropertyDragTarget {
  owner: OwnerRef;
  path: string;
  scale: ValueScale;
  nodes: SVGGraphicsElement[];
  pointerId: number;
}

export function blockPrefixOf(path: string): string {
  const lastDot = path.lastIndexOf('.');
  return lastDot === -1 ? '' : path.slice(0, lastDot + 1);
}

function siblingNodes(svg: SVGSVGElement, owner: OwnerRef, path: string): SVGGraphicsElement[] {
  const prefix = blockPrefixOf(path);
  const selector = `[data-sf-id="${CSS.escape(owner.id)}"][data-sf-prop]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)].filter(node => {
    const candidate = node.getAttribute('data-sf-prop') ?? '';
    return prefix === '' ? candidate === path : candidate.startsWith(prefix);
  });
}

export function resolvePropertyDrag(
  svg: SVGSVGElement,
  event: PointerEvent,
  rules: EditableRules | undefined,
): PropertyDragTarget | null {
  if (event.button !== 0 || isCameraGesture(event)) {
    return null;
  }

  const node = (event.target as Element | null)?.closest?.('[data-sf-prop-kind="value"]') as SVGGraphicsElement | null;
  if (!node) {
    return null;
  }

  const path = node.getAttribute('data-sf-prop');
  const owner = resolveOwner(node);
  if (!path || owner?.role !== 'chart' || !isEditablePath(path, rules)) {
    return null;
  }

  const scale = parseValueScale(findOwnerNode(svg, owner.id, isPrimary));
  if (!scale) {
    return null;
  }

  node.setPointerCapture?.(event.pointerId);
  return { owner, path, scale, nodes: siblingNodes(svg, owner, path), pointerId: event.pointerId };
}
