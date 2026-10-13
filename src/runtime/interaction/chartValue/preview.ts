import { barShapePath } from '../../../renderScene/charts/primitives/barShape';
import { linePathData } from '../../../renderScene/charts/primitives/linePath';
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

const LABEL_PILL_PAD_X = 8;
const LABEL_PILL_PAD_Y = 3;
const LABEL_CHAR_WIDTH = 0.58;
const LABEL_LINE_HEIGHT = 1.2;

export interface BarOrigin {
  top: number;
  height: number;
}

function pillPath(x: number, y: number, width: number, height: number): string {
  const r = height / 2;
  return `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

// Moves and rewrites the bar's own value label while it is dragged. Returns
// false when the bar has no label, so the caller can show the drag readout instead.
export function updateBarLabel(svg: SVGSVGElement, drag: ChartValueDragState, origin: BarOrigin, value: number): boolean {
  if (!drag.isBar) {
    return false;
  }
  const id = drag.element.id.replace('chart-bar-', 'chart-bar-label-');
  const text = svg.querySelector<SVGTextElement>(`[id="${id}"]`);
  const [kind, placement, template] = (text?.getAttribute('data-sf-mark') ?? '').split('|');
  if (!text || kind !== 'bar-label') {
    return false;
  }
  const y = pixelForValue(value, drag.scale);
  const top = Math.min(y, drag.baseY);
  const height = Math.max(0, Math.abs(drag.baseY - y));
  const dy = placement === 'center' ? top + height / 2 - (origin.top + origin.height / 2) : top - origin.top;
  const label = (template || '{value}').replace('{value}', String(Math.round(value * 100) / 100));
  const content = text.querySelector('tspan') ?? text;
  content.textContent = label;
  text.setAttribute('transform', `translate(0 ${dy})`);

  const pill = svg.querySelector<SVGPathElement>(`[id="${id}-pill"]`);
  if (pill) {
    const fontSize = parseFloat(text.getAttribute('font-size') ?? '12');
    const stored = pill.dataset.sfPillY;
    const pillY = stored === undefined ? Number((pill.getAttribute('d') ?? '').split(/[\s]+/)[2]) : Number(stored);
    pill.dataset.sfPillY = String(pillY);
    const width = label.length * fontSize * LABEL_CHAR_WIDTH + LABEL_PILL_PAD_X * 2;
    const pillHeight = fontSize * LABEL_LINE_HEIGHT + LABEL_PILL_PAD_Y * 2;
    const centerX = Number(text.getAttribute('x'));
    pill.setAttribute('d', pillPath(centerX - width / 2, pillY, width, pillHeight));
    pill.setAttribute('transform', `translate(0 ${dy})`);
  }
  return true;
}
