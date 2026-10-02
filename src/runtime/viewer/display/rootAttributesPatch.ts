const CAMERA_OWNED_ATTRIBUTES = new Set(['viewbox', 'width', 'height']);

export function patchRootAttributes(svg: SVGSVGElement, next: SVGSVGElement): void {
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
