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

/** Node-for-node equality (tag, attributes, text) of two elements' children —
 *  checked before a <text> node's tspans are wholesale-replaced, so an
 *  unchanged label is not reported as touched just because this branch used
 *  to replace unconditionally on every render. */
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

/** Patches `current` in place to match `next` and returns whether anything
 *  actually changed (attributes, or — for <text> — its tspan content). The
 *  scene-diff classification in sceneNodesPatch.ts depends on this being
 *  precise: a false positive flashes an untouched shape. */
export function patchSceneElement(current: Element, next: Element): boolean {
  const attributesChanged = patchAttributes(current, next);
  let contentChanged = false;
  if (next.tagName.toLowerCase() === 'text' && !childrenEqual(current, next)) {
    contentChanged = true;
    replaceTextContent(current, next);
  }
  return attributesChanged || contentChanged;
}
