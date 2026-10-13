import { barLabelSize, formatBarLabel, pillPath } from '../../../renderScene/charts/primitives/barLabel';
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

export interface BarOrigin {
  top: number;
  height: number;
}

interface BarLabelElements {
  text: SVGTextElement;
  pill: SVGPathElement | null;
  placement: string;
  template: string;
}

function findBarLabel(svg: SVGSVGElement, drag: ChartValueDragState): BarLabelElements | null {
  const id = drag.element.id.replace('chart-bar-', 'chart-bar-label-');
  const text = svg.querySelector<SVGTextElement>(`[id="${id}"]`);
  const [kind, placement, template] = (text?.getAttribute('data-sf-mark') ?? '').split('|');
  if (!text || kind !== 'bar-label') {
    return null;
  }
  return { text, pill: svg.querySelector<SVGPathElement>(`[id="${id}-pill"]`), placement, template };
}

// How far the label travels with the bar: it follows the top edge, or the middle when centered.
function labelShift(placement: string, origin: BarOrigin, top: number, height: number): number {
  return placement === 'center' ? top + height / 2 - (origin.top + origin.height / 2) : top - origin.top;
}

function resizePill(pill: SVGPathElement, text: SVGTextElement, label: string, dy: number): void {
  const fontSize = parseFloat(text.getAttribute('font-size') ?? '12');
  const size = barLabelSize(label, fontSize, true);
  // The pill's own top edge is read once from its first path command and kept.
  const stored = pill.dataset.sfPillY ?? (pill.getAttribute('d') ?? '').split(/\s+/)[2];
  pill.dataset.sfPillY = stored;
  const centerX = Number(text.getAttribute('x'));
  pill.setAttribute('d', pillPath(centerX - size.width / 2, Number(stored), size.width, size.height));
  pill.setAttribute('transform', `translate(0 ${dy})`);
}

// Moves and rewrites the bar's own value label while it is dragged. Returns
// false when the bar has no label, so the caller can show the drag readout instead.
export function updateBarLabel(svg: SVGSVGElement, drag: ChartValueDragState, origin: BarOrigin, value: number): boolean {
  const label = drag.isBar ? findBarLabel(svg, drag) : null;
  if (!label) {
    return false;
  }
  const y = pixelForValue(value, drag.scale);
  const top = Math.min(y, drag.baseY);
  const height = Math.abs(drag.baseY - y);
  const dy = labelShift(label.placement, origin, top, height);
  const content = formatBarLabel(value, label.template);

  (label.text.querySelector('tspan') ?? label.text).textContent = content;
  label.text.setAttribute('transform', `translate(0 ${dy})`);
  if (label.pill) {
    resizePill(label.pill, label.text, content, dy);
  }
  return true;
}
