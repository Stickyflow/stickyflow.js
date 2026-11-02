// A part of the drawing behind a surface, and the shader it lies on.
export interface BackdropLayer {
  on?: Element;
  image: HTMLImageElement;
}

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
  return preparedClone(svg, clone, width, height, true);
}

function preparedClone(
  svg: SVGSVGElement,
  clone: SVGSVGElement,
  width: number,
  height: number,
  withHost: boolean,
): SVGSVGElement {
  for (const surface of clone.querySelectorAll('foreignObject[data-sf-shader]')) {
    surface.remove();
  }
  const background = withHost ? hostBackground(svg) : undefined;
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

function loadSvg(svg: SVGSVGElement, clone: SVGSVGElement): Promise<HTMLImageElement | undefined> {
  const markup = new XMLSerializer().serializeToString(clone);
  const image = svg.ownerDocument.createElement('img');
  return new Promise(resolve => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(undefined);
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
}

// What lies behind the owner, cut at every shader, so that these can be laid in between while they run. Empty when no shader lies behind it.
export async function captureBackdropLayers(svg: SVGSVGElement, owner: Element): Promise<BackdropLayer[]> {
  const children = [...svg.children];
  const ownerIndex = children.indexOf(owner);
  const cuts = children.flatMap((child, index) =>
    index < ownerIndex && child.matches('foreignObject[data-sf-shader]') ? [index] : [],
  );
  if (cuts.length === 0) {
    return [];
  }
  const width = Math.max(1, svg.clientWidth);
  const height = Math.max(1, svg.clientHeight);
  const parts = [-1, ...cuts].map(async (cut, part) => {
    const end = cuts[part] ?? ownerIndex;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    [...clone.children].forEach((copy, index) => {
      if (copy.tagName !== 'defs' && copy.tagName !== 'style' && (index <= cut || index >= end)) {
        copy.remove();
      }
    });
    const image = await loadSvg(svg, preparedClone(svg, clone, width, height, part === 0));
    return image ? [{ on: cut >= 0 ? children[cut] : undefined, image }] : [];
  });
  return (await Promise.all(parts)).flat();
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
