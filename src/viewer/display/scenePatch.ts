const CAMERA_OWNED_ATTRIBUTES = new Set(['viewbox', 'width', 'height']);

function patchAttributes(current: Element, next: Element): void {
  for (const attribute of Array.from(current.attributes)) {
    if (!next.hasAttribute(attribute.name)) {
      current.removeAttribute(attribute.name);
    }
  }
  for (const attribute of Array.from(next.attributes)) {
    if (current.getAttribute(attribute.name) !== attribute.value) {
      current.setAttribute(attribute.name, attribute.value);
    }
  }
}

function replaceTextContent(current: Element, next: Element): void {
  while (current.firstChild) {
    current.removeChild(current.firstChild);
  }
  while (next.firstChild) {
    current.appendChild(next.firstChild);
  }
}

function patchDefinitions(svg: SVGSVGElement, next: SVGSVGElement): Element | null {
  const currentDefinitions = svg.querySelector(':scope > defs');
  const nextDefinitions = next.querySelector(':scope > defs');
  if (nextDefinitions) {
    if (currentDefinitions) {
      currentDefinitions.replaceWith(nextDefinitions);
    } else {
      svg.insertBefore(nextDefinitions, svg.firstChild);
    }
    return nextDefinitions;
  }
  currentDefinitions?.remove();
  return currentDefinitions;
}

function patchSceneNodes(svg: SVGSVGElement, next: SVGSVGElement): void {
  const definitions = patchDefinitions(svg, next);
  const currentById = new Map<string, Element>();
  for (const element of svg.querySelectorAll(':scope > [id]')) {
    currentById.set(element.id, element);
  }
  const keep = new Set<string>();
  let previousSibling: Node | null = definitions;
  for (const nextElement of next.querySelectorAll(':scope > [id]')) {
    keep.add(nextElement.id);
    const currentElement = currentById.get(nextElement.id);
    let liveElement: Element;
    if (currentElement && currentElement.tagName === nextElement.tagName) {
      patchAttributes(currentElement, nextElement);
      if (nextElement.tagName.toLowerCase() === 'text') {
        replaceTextContent(currentElement, nextElement);
      }
      liveElement = currentElement;
    } else {
      currentElement?.remove();
      liveElement = nextElement;
    }
    const wantedNext = previousSibling ? previousSibling.nextSibling : svg.firstChild;
    if (wantedNext !== liveElement) {
      svg.insertBefore(liveElement, wantedNext);
    }
    previousSibling = liveElement;
  }
  for (const [id, element] of currentById) {
    if (!keep.has(id)) {
      element.remove();
    }
  }
}

function patchRootAttributes(svg: SVGSVGElement, next: SVGSVGElement): void {
  for (const attribute of Array.from(svg.attributes)) {
    if (!CAMERA_OWNED_ATTRIBUTES.has(attribute.name.toLowerCase())) {
      svg.removeAttribute(attribute.name);
    }
  }
  for (const attribute of Array.from(next.attributes)) {
    if (!CAMERA_OWNED_ATTRIBUTES.has(attribute.name.toLowerCase())) {
      svg.setAttribute(attribute.name, attribute.value);
    }
  }
}

export function patchDisplayContent(svg: SVGSVGElement, next: SVGSVGElement): void {
  patchRootAttributes(svg, next);
  patchSceneNodes(svg, next);
}
