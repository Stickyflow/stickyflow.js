import { classifySceneDiff } from './classifySceneDiff';
import { patchDefinitions } from './definitionsPatch';
import { patchSceneElement } from './elementPatch';
import type { SceneDiff } from './types';

function ownerIdOf(element: Element): string {
  return element.getAttribute('data-sf-id') ?? element.id;
}

// A document may have the same name twice, as two Repeat blocks do with templates of one name. Elements are matched by id and by how many of that
// id came before, so every one of them is patched, kept or dropped on its own and none is left behind.
function keyedElements(svg: SVGSVGElement): Array<[string, Element]> {
  const seen = new Map<string, number>();
  return Array.from(svg.querySelectorAll(':scope > [id]'), (element): [string, Element] => {
    const count = seen.get(element.id) ?? 0;
    seen.set(element.id, count + 1);
    return [`${element.id}#${count}`, element];
  });
}

function currentElementsById(svg: SVGSVGElement): Map<string, Element> {
  return new Map(keyedElements(svg));
}

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
  for (const [key, nextElement] of keyedElements(next)) {
    retainedIds.add(key);
    newOwnerIds.add(ownerIdOf(nextElement));
    const liveElement = reusableElement(currentById.get(key), nextElement, markTouched);
    placeAfter(svg, liveElement, previousSibling);
    previousSibling = liveElement;
  }

  for (const [key, element] of currentById) {
    if (!retainedIds.has(key)) {
      touchedOwnerIds.add(ownerIdOf(element));
      element.remove();
    }
  }

  return classifySceneDiff(oldOwnerIds, newOwnerIds, touchedOwnerIds);
}
