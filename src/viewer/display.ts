import { patchDisplayContent } from './display/scenePatch';
import { parseSvg, readViewBox } from './display/svgDocument';
import type { DisplayHandle, ViewBox } from './display/types';
import { ViewportController } from './display/viewport';

export type { DisplayHandle, ViewBox } from './display/types';

export function mountDisplay(container: HTMLElement, svgString: string): DisplayHandle {
  const svg = parseSvg(svgString);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  svg.style.touchAction = 'none';
  const viewport = new ViewportController(svg, readViewBox(svg));
  container.appendChild(svg);
  viewport.apply();
  return {
    svg,
    fit: () => viewport.fit(),
    getViewport: (): ViewBox => viewport.get(),
    zoomBy: (factor, clientX, clientY) => viewport.zoomBy(factor, clientX, clientY),
    panBy: (dxPixels, dyPixels) => viewport.panBy(dxPixels, dyPixels),
    updateContent(nextSvgString) {
      const next = parseSvg(nextSvgString);
      patchDisplayContent(svg, next);
      viewport.setNatural(readViewBox(next));
    },
    destroy() {
      svg.remove();
    },
  };
}
