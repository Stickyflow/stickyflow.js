import { patchDefinitions } from './definitionsPatch';
import { patchSceneElement } from './elementPatch';

function currentElementsById(svg: SVGSVGElement): Map<string, Element> {
  const elements = new Map<string, Element>();
  for (const element of svg.querySelectorAll(':scope > [id]')) {
    elements.set(element.id, element);
  }
  return elements;
}

function reusableElement(current: Element | undefined, next: Element): Element {
  if (current && current.tagName === next.tagName) {
    patchSceneElement(current, next);
    return current;
  }
  current?.remove();
  return next;
}

function placeAfter(svg: SVGSVGElement, element: Element, previousSibling: Node | null): void {
  const wantedNext = previousSibling ? previousSibling.nextSibling : svg.firstChild;
  if (wantedNext !== element) {
    svg.insertBefore(element, wantedNext);
  }
}

export function patchSceneNodes(svg: SVGSVGElement, next: SVGSVGElement): void {
  const definitions = patchDefinitions(svg, next);
  const currentById = currentElementsById(svg);
  const retainedIds = new Set<string>();
  let previousSibling: Node | null = definitions;

  for (const nextElement of next.querySelectorAll(':scope > [id]')) {
    retainedIds.add(nextElement.id);
    const liveElement = reusableElement(currentById.get(nextElement.id), nextElement);
    placeAfter(svg, liveElement, previousSibling);
    previousSibling = liveElement;
  }

  for (const [id, element] of currentById) {
    if (!retainedIds.has(id)) {
      element.remove();
    }
  }
}
