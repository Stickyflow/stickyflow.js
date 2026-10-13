export interface ShaderBackdrop {
  image: HTMLImageElement;
  height: number;
  width: number;
}

const MIN_BACKDROP_DENSITY = 2.5;
const MAX_BACKDROP_PIXELS = 4096;

const TRANSPARENT = /^rgba?(s*d+,s*d+,s*d+,s*0s*)$|^transparent$/;

function hostBackground(svg: SVGSVGElement): string | undefined {
  const view = svg.ownerDocument.defaultView;
  for (let element: Element | null = svg.parentElement; element && view; element = element.parentElement) {
    const color = view.getComputedStyle(element).backgroundColor;
    if (color && !TRANSPARENT.test(color.trim())) {
      return color;
    }
  }
  return undefined;
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
  const background = hostBackground(svg);
  if (background) {
    const { x, y, width: viewWidth, height: viewHeight } = svg.viewBox.baseVal;
    const fill = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'rect');
    fill.setAttribute('x', String(x));
    fill.setAttribute('y', String(y));
    fill.setAttribute('width', String(viewWidth));
    fill.setAttribute('height', String(viewHeight));
    fill.setAttribute('fill', background);
    clone.insertBefore(fill, clone.firstChild);
  }
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return clone;
}

export function captureShaderBackdrop(svg: SVGSVGElement, owner: Element): Promise<ShaderBackdrop | undefined> {
  const density = Math.max(globalThis.devicePixelRatio || 1, MIN_BACKDROP_DENSITY);
  const scale = Math.min(density, MAX_BACKDROP_PIXELS / Math.max(1, Math.max(svg.clientWidth, svg.clientHeight)));
  const width = Math.max(1, Math.round(svg.clientWidth * scale));
  const height = Math.max(1, Math.round(svg.clientHeight * scale));
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
