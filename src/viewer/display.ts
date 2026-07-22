// STATIC display layer of the viewer: put the SVG on screen and move the camera.
// No model, no selection, no events — a docs page could use just this. Everything
// interactive lives in interaction.ts. (DOM code — verify in a browser.)

export interface ViewBox { x: number; y: number; w: number; h: number }

export interface DisplayHandle {
  readonly svg: SVGSVGElement;
  /** Reset the camera to the diagram's natural bounds. */
  fit(): void;
  /** Zoom around a client point (defaults to viewport centre). factor>1 zooms in. */
  zoomBy(factor: number, clientX?: number, clientY?: number): void;
  /** Pan by a pixel delta. */
  panBy(dxPixels: number, dyPixels: number): void;
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

/** Mount an SVG string into a container and return camera controls. */
export function mountDisplay(container: HTMLElement, svgString: string): DisplayHandle {
  const svg = parseSvg(svgString);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  svg.style.touchAction = 'none';

  const natural = readViewBox(svg);
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
    fit() { view = { ...natural }; apply(); },
    zoomBy(factor, clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const cx = clientX ?? rect.left + rect.width / 2;
      const cy = clientY ?? rect.top + rect.height / 2;
      // Anchor: keep the world point under the cursor fixed while scaling.
      const wx = view.x + (cx - rect.left) / rect.width * view.w;
      const wy = view.y + (cy - rect.top) / rect.height * view.h;
      view = { w: view.w / factor, h: view.h / factor, x: 0, y: 0 } as ViewBox;
      view.x = wx - (cx - rect.left) / rect.width * view.w;
      view.y = wy - (cy - rect.top) / rect.height * view.h;
      apply();
    },
    panBy(dxPixels, dyPixels) {
      const scale = pxPerUnit();
      view.x -= dxPixels / scale;
      view.y -= dyPixels / scale;
      apply();
    },
    destroy() { svg.remove(); },
  };
}
