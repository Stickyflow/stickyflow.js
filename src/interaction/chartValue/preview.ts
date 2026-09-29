import { barShapePath } from '../../rendering/charts/primitives/barShape';
import { linePathData } from '../../rendering/charts/primitives/linePath';
import { findConnectedLine, findConnectedLineArea, findSeriesPoints } from './lineLookup';
import { pixelForValue } from './scale';
import type { ChartValueDragState } from './types';

function updateConnectedLine(svg: SVGSVGElement, drag: ChartValueDragState): void {
  const points = findSeriesPoints(svg, drag.owner.id, drag.series).map(point => ({
    x: Number(point.getAttribute('cx')),
    y: Number(point.getAttribute('cy')),
  }));
  const line = findConnectedLine(svg, drag.owner.id, drag.series);
  if (line) {
    line.setAttribute('d', linePathData(points, drag.lineTension));
  }
  const area = findConnectedLineArea(svg, drag.owner.id, drag.series);
  if (area && points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    const d = `${linePathData(points, drag.lineTension)} L ${last.x} ${drag.baseY} L ${first.x} ${drag.baseY} Z`;
    area.setAttribute('d', d);
  }
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
