import { patchDisplayContent } from './scenePatch';
import { parseSvg, readViewBox } from './svgDocument';
import type { DisplayHandle, ViewBox } from './types';
import { ViewportController } from './viewport';

export { classifySceneDiff } from './classifySceneDiff';
export type { DisplayHandle, SceneDiff, ViewBox } from './types';

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
      const diff = patchDisplayContent(svg, next);
      viewport.setNatural(readViewBox(next));
      return diff;
    },
    destroy() {
      svg.remove();
    },
  };
}
