import { barShapePath } from '../../rendering/charts/primitives/barShape';
import { linePathData } from '../../rendering/charts/primitives/linePath';
import { findConnectedLine, findSeriesPoints } from './lineLookup';
import { pixelForValue } from './scale';
import type { ChartValueDragState } from './types';

function updateConnectedLine(svg: SVGSVGElement, drag: ChartValueDragState): void {
  const line = findConnectedLine(svg, drag.owner.id, drag.series);
  if (!line) {
    return;
  }
  const points = findSeriesPoints(svg, drag.owner.id, drag.series).map(point => ({
    x: Number(point.getAttribute('cx')),
    y: Number(point.getAttribute('cy')),
  }));
  line.setAttribute('d', linePathData(points, drag.lineTension));
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
