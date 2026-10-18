function patchAttributes(current: Element, next: Element): boolean {
  let changed = false;
  for (const attribute of Array.from(current.attributes)) {
    if (!next.hasAttribute(attribute.name)) {
      current.removeAttribute(attribute.name);
      changed = true;
    }
  }
  for (const attribute of Array.from(next.attributes)) {
    if (current.getAttribute(attribute.name) !== attribute.value) {
      current.setAttribute(attribute.name, attribute.value);
      changed = true;
    }
  }
  return changed;
}

function childrenEqual(a: Element, b: Element): boolean {
  const aChildren = Array.from(a.childNodes);
  const bChildren = Array.from(b.childNodes);
  if (aChildren.length !== bChildren.length) {
    return false;
  }
  for (let i = 0; i < aChildren.length; i++) {
    const x = aChildren[i];
    const y = bChildren[i];
    if (x.nodeType !== y.nodeType) {
      return false;
    }
    if (x.nodeType === Node.TEXT_NODE) {
      if (x.textContent !== y.textContent) {
        return false;
      }
      continue;
    }
    if (x.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    const xElement = x as Element;
    const yElement = y as Element;
    if (xElement.tagName !== yElement.tagName) {
      return false;
    }
    if (xElement.attributes.length !== yElement.attributes.length) {
      return false;
    }
    for (const attribute of Array.from(xElement.attributes)) {
      if (yElement.getAttribute(attribute.name) !== attribute.value) {
        return false;
      }
    }
    if (!childrenEqual(xElement, yElement)) {
      return false;
    }
  }
  return true;
}

function replaceTextContent(current: Element, next: Element): void {
  while (current.firstChild) {
    current.removeChild(current.firstChild);
  }
  while (next.firstChild) {
    current.appendChild(next.firstChild);
  }
}

export function patchSceneElement(current: Element, next: Element): boolean {
  const componentRestyled =
    next.hasAttribute('data-sf-widget') &&
    (current.getAttribute('data-sf-widget-style') !== next.getAttribute('data-sf-widget-style') ||
      current.getAttribute('data-sf-widget-value') !== next.getAttribute('data-sf-widget-value'));
  const attributesChanged = patchAttributes(current, next);
  let contentChanged = false;
  if (componentRestyled) {
    contentChanged = true;
    replaceTextContent(current, next);
  }
  if (next.tagName.toLowerCase() === 'text' && !childrenEqual(current, next)) {
    contentChanged = true;
    replaceTextContent(current, next);
  }
  return attributesChanged || contentChanged;
}
