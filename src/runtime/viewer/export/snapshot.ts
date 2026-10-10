const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function copyAttributes(source: Element, target: Element): void {
  for (const attribute of source.attributes) {
    if (!attribute.name.startsWith('data-sf-shader')) {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function removeRuntimeOverlays(svg: SVGSVGElement): void {
  for (const overlay of svg.querySelectorAll('[data-sf-selection-overlay], [data-sf-change-overlay]')) {
    overlay.remove();
  }
}

export function freezeShaderSurfaces(svg: SVGSVGElement, captures: readonly (string | undefined)[]): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  removeRuntimeOverlays(clone);
  const surfaces = [...clone.querySelectorAll<SVGForeignObjectElement>('foreignObject[data-sf-shader]')];
  surfaces.forEach((surface, index) => {
    const capture = captures[index];
    if (!capture) {
      surface.remove();
      return;
    }
    const image = clone.ownerDocument.createElementNS(SVG_NAMESPACE, 'image');
    copyAttributes(surface, image);
    image.setAttribute('href', capture);
    image.setAttribute('preserveAspectRatio', 'none');
    surface.replaceWith(image);
  });
  const viewBox = (clone.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  if (viewBox.length === 4 && viewBox.every(Number.isFinite)) {
    clone.setAttribute('width', String(viewBox[2]));
    clone.setAttribute('height', String(viewBox[3]));
  }
  clone.setAttribute('xmlns', SVG_NAMESPACE);
  return clone;
}

export function serializeSvgSnapshot(svg: SVGSVGElement, captures: readonly (string | undefined)[]): string {
  return new XMLSerializer().serializeToString(freezeShaderSurfaces(svg, captures));
}
