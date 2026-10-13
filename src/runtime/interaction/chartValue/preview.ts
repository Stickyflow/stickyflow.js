import { BAR_LABEL, barLabelSize, formatBarLabel, pillPath } from '../../../renderScene/charts/primitives/barLabel';
import { barShapePath, roundedBarPath } from '../../../renderScene/charts/primitives/barShape';
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
  if (drag.isBar && drag.scale.horizontal) {
    const width = Math.max(0, pixelForValue(value, drag.scale) - drag.barX);
    drag.element.setAttribute('d', roundedBarPath(drag.barX, drag.barTop, width, drag.barHeight, drag.barRadius));
    return;
  }
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
  left: number;
  width: number;
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
  if (placement === 'axis') {
    return 0;
  }
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
// Horizontal bars: the label rides at the bar end (or centered) and keeps its own edge fixed as the text grows.
function updateHorizontalBarLabel(label: BarLabelElements, drag: ChartValueDragState, origin: BarOrigin, value: number): boolean {
  const content = formatBarLabel(value, label.template);
  (label.text.querySelector('tspan') ?? label.text).textContent = content;
  if (label.placement === 'axis') {
    return true;
  }
  const fontSize = parseFloat(label.text.getAttribute('font-size') ?? '12');
  const size = barLabelSize(content, fontSize, label.pill !== null);
  const width = Math.max(0, pixelForValue(value, drag.scale) - origin.left);
  const end = origin.left + width;
  const center =
    label.placement === 'outside'
      ? end + BAR_LABEL.gap + size.width / 2
      : label.placement === 'inside'
        ? end - BAR_LABEL.gap - size.width / 2
        : origin.left + width / 2;
  const stored = label.text.dataset.sfLabelX ?? label.text.getAttribute('x') ?? '0';
  label.text.dataset.sfLabelX = stored;
  label.text.setAttribute('transform', `translate(${center - Number(stored)} 0)`);
  if (label.pill) {
    const pillY = label.pill.dataset.sfPillY ?? (label.pill.getAttribute('d') ?? '').split(/\s+/)[2];
    label.pill.dataset.sfPillY = pillY;
    label.pill.removeAttribute('transform');
    label.pill.setAttribute('d', pillPath(center - size.width / 2, Number(pillY), size.width, size.height));
  }
  return true;
}

export function updateBarLabel(svg: SVGSVGElement, drag: ChartValueDragState, origin: BarOrigin, value: number): boolean {
  const label = drag.isBar ? findBarLabel(svg, drag) : null;
  if (!label) {
    return false;
  }
  if (drag.scale.horizontal) {
    return updateHorizontalBarLabel(label, drag, origin, value);
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
