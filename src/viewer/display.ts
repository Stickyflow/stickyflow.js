export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DisplayHandle {
  readonly svg: SVGSVGElement;
  fit(): void;
  getViewport(): ViewBox;
  zoomBy(factor: number, clientX?: number, clientY?: number): void;
  panBy(dxPixels: number, dyPixels: number): void;
  updateContent(svgString: string): void;
  destroy(): void;
}

function parseSvg(svgString: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement as unknown as SVGSVGElement;
  if (root.nodeName.toLowerCase() !== 'svg') throw new Error('viewer: source did not parse to an <svg> root');
  return root;
}

function readViewBox(svg: SVGSVGElement): ViewBox {
  const raw = (svg.getAttribute('viewBox') ?? '0 0 100 100').split(/\s+/).map(Number);
  return { x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
}

const CAMERA_OWNED_ATTRS = new Set(['viewbox', 'width', 'height']);

function patchAttributes(current: Element, next: Element): void {
  Array.from(current.attributes).forEach(attr => {
    if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
  });
  Array.from(next.attributes).forEach(attr => {
    if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
  });
}

function patchSceneNodes(svg: SVGSVGElement, next: SVGSVGElement): void {
  const currentDefs = svg.querySelector(':scope > defs');
  const nextDefs = next.querySelector(':scope > defs');
  if (nextDefs) {
    if (currentDefs) currentDefs.replaceWith(nextDefs);
    else svg.insertBefore(nextDefs, svg.firstChild);
  } else {
    currentDefs?.remove();
  }

  const currentById = new Map<string, Element>();
  svg.querySelectorAll(':scope > [id]').forEach(el => {
    currentById.set(el.id, el);
  });
  const keep = new Set<string>();

  let prevSibling: Node | null = nextDefs ?? currentDefs ?? null;
  next.querySelectorAll(':scope > [id]').forEach(nextEl => {
    keep.add(nextEl.id);
    const currentEl = currentById.get(nextEl.id);
    let liveEl: Element;
    if (currentEl && currentEl.tagName === nextEl.tagName) {
      patchAttributes(currentEl, nextEl);
      if (nextEl.tagName.toLowerCase() === 'text') {
        while (currentEl.firstChild) currentEl.removeChild(currentEl.firstChild);
        while (nextEl.firstChild) currentEl.appendChild(nextEl.firstChild);
      }
      liveEl = currentEl;
    } else {
      currentEl?.remove();
      liveEl = nextEl;
    }
    const wantedNext = prevSibling ? prevSibling.nextSibling : svg.firstChild;
    if (wantedNext !== liveEl) svg.insertBefore(liveEl, wantedNext);
    prevSibling = liveEl;
  });

  currentById.forEach((el, id) => {
    if (!keep.has(id)) el.remove();
  });
}

export function mountDisplay(container: HTMLElement, svgString: string): DisplayHandle {
  const svg = parseSvg(svgString);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  svg.style.touchAction = 'none';

  let natural = readViewBox(svg);
  let view: ViewBox = { ...natural };

  const apply = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

  const pxPerUnit = () => {
    const rect = svg.getBoundingClientRect();
    return rect.width > 0 ? rect.width / view.w : 1;
  };

  container.appendChild(svg);
  apply();

  return {
    svg,
    fit() {
      view = { ...natural };
      apply();
    },
    getViewport() {
      return { ...view };
    },
    zoomBy(factor, clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const cx = clientX ?? rect.left + rect.width / 2;
      const cy = clientY ?? rect.top + rect.height / 2;
      const wx = view.x + ((cx - rect.left) / rect.width) * view.w;
      const wy = view.y + ((cy - rect.top) / rect.height) * view.h;
      view = { w: view.w / factor, h: view.h / factor, x: 0, y: 0 } as ViewBox;
      view.x = wx - ((cx - rect.left) / rect.width) * view.w;
      view.y = wy - ((cy - rect.top) / rect.height) * view.h;
      apply();
    },
    panBy(dxPixels, dyPixels) {
      const scale = pxPerUnit();
      view.x -= dxPixels / scale;
      view.y -= dyPixels / scale;
      apply();
    },
    updateContent(nextSvgString) {
      const next = parseSvg(nextSvgString);
      Array.from(svg.attributes).forEach(attr => {
        if (!CAMERA_OWNED_ATTRS.has(attr.name.toLowerCase())) svg.removeAttribute(attr.name);
      });
      Array.from(next.attributes).forEach(attr => {
        if (!CAMERA_OWNED_ATTRS.has(attr.name.toLowerCase())) svg.setAttribute(attr.name, attr.value);
      });
      patchSceneNodes(svg, next);
      natural = readViewBox(next);
    },
    destroy() {
      svg.remove();
    },
  };
}
