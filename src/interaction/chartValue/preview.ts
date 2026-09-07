import { barShapePath } from '../../rendering/charts/primitives/barShape';
import { pixelForValue } from './scale';
import type { ChartValueDragState } from './types';

function findConnectedLine(svg: SVGSVGElement, drag: ChartValueDragState): SVGGraphicsElement | null {
  const selector = `[data-sf-id="${CSS.escape(drag.owner.id)}"][data-sf-series="${CSS.escape(drag.series)}"]`;
  return (
    [...svg.querySelectorAll<SVGGraphicsElement>(selector)].find(el => el.tagName.toLowerCase() === 'path') ?? null
  );
}

function findSeriesPoints(svg: SVGSVGElement, drag: ChartValueDragState): SVGGraphicsElement[] {
  const selector =
    `[data-sf-id="${CSS.escape(drag.owner.id)}"]` +
    `[data-sf-series="${CSS.escape(drag.series)}"]` +
    '[data-sf-value-index]';
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)]
    .filter(el => el.tagName.toLowerCase() === 'ellipse')
    .sort((a, b) => Number(a.getAttribute('data-sf-value-index')) - Number(b.getAttribute('data-sf-value-index')));
}

// A dragged point moves on its own : nothing re-derives the line connecting
// it to its neighbors, so it visibly detaches mid-drag. Rebuilt here from
// every point's own live cx/cy rather than editing the existing `d` string,
// since the dragged point has already written its new cy by the time this runs.
function updateConnectedLine(svg: SVGSVGElement, drag: ChartValueDragState): void {
  const line = findConnectedLine(svg, drag);
  if (!line) {
    return;
  }
  const points = findSeriesPoints(svg, drag);
  const d = points.map(
    (point, index) => `${index ? 'L' : 'M'} ${point.getAttribute('cx')} ${point.getAttribute('cy')}`,
  );
  line.setAttribute('d', d.join(' '));
}

export function updateChartValuePreview(svg: SVGSVGElement, drag: ChartValueDragState, value: number): void {
  const y = pixelForValue(value, drag.scale);
  if (drag.isBar) {
    const top = Math.min(y, drag.baseY);
    const height = Math.max(0, Math.abs(drag.baseY - y));
    drag.element.setAttribute('d', barShapePath(drag.barX, top, drag.barWidth, height, drag.barRadius));
    return;
  }
  drag.element.setAttribute('cy', String(y));
  updateConnectedLine(svg, drag);
}
