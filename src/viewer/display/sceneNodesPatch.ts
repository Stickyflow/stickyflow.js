import { classifySceneDiff } from './classifySceneDiff';
import { patchDefinitions } from './definitionsPatch';
import { patchSceneElement } from './elementPatch';
import type { SceneDiff } from './types';

/** An element's semantic owner id — data-sf-id for anything the renderer
 *  stamped with the interactive contract, else its own plain id (defs
 *  children and other non-owner nodes carry no data-sf-id). */
function ownerIdOf(element: Element): string {
  return element.getAttribute('data-sf-id') ?? element.id;
}

function currentElementsById(svg: SVGSVGElement): Map<string, Element> {
  const elements = new Map<string, Element>();
  for (const element of svg.querySelectorAll(':scope > [id]')) {
    elements.set(element.id, element);
  }
  return elements;
}

/** Reuses `current` when it can share a node with `next`, else swaps `next`
 *  in. Calls `markTouched` with the owner id whenever the live element
 *  actually changed or is brand new — that is what feeds the scene diff. */
function reusableElement(current: Element | undefined, next: Element, markTouched: (ownerId: string) => void): Element {
  if (current && current.tagName === next.tagName) {
    if (patchSceneElement(current, next)) {
      markTouched(ownerIdOf(next));
    }
    return current;
  }
  current?.remove();
  markTouched(ownerIdOf(next));
  return next;
}

function placeAfter(svg: SVGSVGElement, element: Element, previousSibling: Node | null): void {
  const wantedNext = previousSibling ? previousSibling.nextSibling : svg.firstChild;
  if (wantedNext !== element) {
    svg.insertBefore(element, wantedNext);
  }
}

export function patchSceneNodes(svg: SVGSVGElement, next: SVGSVGElement): SceneDiff {
  const definitions = patchDefinitions(svg, next);
  const currentById = currentElementsById(svg);
  const retainedIds = new Set<string>();

  const oldOwnerIds = new Set<string>();
  for (const element of currentById.values()) {
    oldOwnerIds.add(ownerIdOf(element));
  }
  const newOwnerIds = new Set<string>();
  const touchedOwnerIds = new Set<string>();
  const markTouched = (ownerId: string): void => {
    touchedOwnerIds.add(ownerId);
  };

  let previousSibling: Node | null = definitions;
  for (const nextElement of next.querySelectorAll(':scope > [id]')) {
    retainedIds.add(nextElement.id);
    newOwnerIds.add(ownerIdOf(nextElement));
    const liveElement = reusableElement(currentById.get(nextElement.id), nextElement, markTouched);
    placeAfter(svg, liveElement, previousSibling);
    previousSibling = liveElement;
  }

  for (const [id, element] of currentById) {
    if (!retainedIds.has(id)) {
      touchedOwnerIds.add(ownerIdOf(element));
      element.remove();
    }
  }

  return classifySceneDiff(oldOwnerIds, newOwnerIds, touchedOwnerIds);
}
