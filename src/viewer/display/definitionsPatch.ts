export function patchDefinitions(svg: SVGSVGElement, next: SVGSVGElement): Element | null {
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
