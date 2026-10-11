export interface ShaderBackdrop {
  image: HTMLImageElement;
  height: number;
  width: number;
}

function backdropClone(svg: SVGSVGElement, owner: Element, width: number, height: number): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const ownerIndex = [...svg.children].indexOf(owner);
  if (ownerIndex >= 0) {
    while (clone.children.length > ownerIndex) {
      clone.lastElementChild?.remove();
    }
  }
  for (const surface of clone.querySelectorAll('foreignObject[data-sf-shader]')) {
    surface.remove();
  }
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return clone;
}

export function captureShaderBackdrop(svg: SVGSVGElement, owner: Element): Promise<ShaderBackdrop | undefined> {
  const width = Math.max(1, Math.round(svg.clientWidth * (globalThis.devicePixelRatio || 1)));
  const height = Math.max(1, Math.round(svg.clientHeight * (globalThis.devicePixelRatio || 1)));
  const view = svg.ownerDocument.defaultView;
  if (!view) {
    return Promise.resolve(undefined);
  }

  const markup = new XMLSerializer().serializeToString(backdropClone(svg, owner, width, height));
  const image = svg.ownerDocument.createElement('img');
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

  return new Promise(resolve => {
    image.onload = () => resolve({ image, width, height });
    image.onerror = () => resolve(undefined);
    image.src = source;
  });
}
