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

export function patchSceneElement(current: Element, next: Element): void {
  patchAttributes(current, next);
  if (next.tagName.toLowerCase() === 'text') {
    replaceTextContent(current, next);
  }
}
