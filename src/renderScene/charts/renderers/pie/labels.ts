import type { ChartSeries, PieChart } from '../../../../model/chart';
import type { RenderNode, SceneText } from '../../../scene';
import { DEFAULT_FONT, finite } from '../../../scene';
import { clipSegmentToRect, representativeColor, sameHueContrastColor, sameHueTint } from '../../primitives';
import { seriesLabelProp, seriesValueProp } from '../../propPath';
import type { ChartRenderContext } from '../types';
import { pieArcPoint } from './geometry';
import type { PieGeometry } from './types';

const MIN_LABEL_SWEEP = (14 * Math.PI) / 180;
export const LABEL_WIDTH = 80;
const LABEL_RADIUS_FRACTION = 0.62;
const OUTSIDE_GAP = 14;
export const LEADER_INSET = 3;
const OUTSIDE_TINT_LIGHTNESS = 0.32;
const OUTSIDE_FALLBACK_COLOR = '#334155';

export interface PieLabelMark {
  seriesId: string;
  label: string;
  color: NonNullable<ChartSeries['color']>;
  share: number;
  start: number;
  end: number;
  labelOffsetX: number;
  labelOffsetY: number;
  // The slice is pushed out, and its label moves with it.
  shift: { dx: number; dy: number };
}

export function renderPieLabels(
  context: ChartRenderContext<PieChart>,
  geometry: PieGeometry,
  marks: PieLabelMark[],
): RenderNode[] {
  if (context.chart.showAxisLabels === false) {
    return [];
  }
  return marks
    .filter(mark => mark.end - mark.start >= MIN_LABEL_SWEEP)
    .flatMap(mark => createPieLabel(context, geometry, mark));
}

function labelTextPair(
  context: ChartRenderContext,
  mark: PieLabelMark,
  point: { x: number; y: number },
  color: string,
  fontSize: number,
  percent: number,
  outside: boolean,
  midAngle: number,
): SceneText[] {
  const { chart, bounds, nextOrder } = context;
  const lineHeight = fontSize * 1.2;
  const content = chart.config?.pieLabelContent ?? 'both';
  const width = content === 'inline' ? LABEL_WIDTH * 1.9 : LABEL_WIDTH;
  const base = {
    bounds,
    x: point.x - width / 2,
    width,
    height: lineHeight,
    fontFamily: chart.fontFamily ?? DEFAULT_FONT,
    fontSize,
    align: 'center' as const,
    verticalAlign: 'middle' as const,
    lineHeight: 1.2,
    color,
  };
  const detail = (extra: Record<string, unknown>) => ({
    of: 'chartSeries' as const,
    series: mark.seriesId,
    mark: 'pie-label',
    pulled: outside || undefined,
    midAngle,
    ...extra,
  });
  const nameText: SceneText = {
    type: 'text',
    id: `chart-pie-label-name-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    ...base,
    y: content === 'name' ? point.y - lineHeight / 2 : point.y - lineHeight,
    lines: [content === 'inline' ? `${mark.label}, ${percent}%` : mark.label],
    fontWeight: 'bold',
    detail: detail({}),
    prop: seriesLabelProp(mark.seriesId),
  };
  const valueText: SceneText = {
    type: 'text',
    id: `chart-pie-label-value-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    ...base,
    y: content === 'percent' ? point.y - lineHeight / 2 : point.y,
    lines: [`${percent}%`],
    fontWeight: 'normal',
    detail: detail({}),
    prop: seriesValueProp(mark.seriesId, 0),
    propKind: 'value',
  };
  if (content === 'inline' || content === 'name') {
    return [nameText];
  }
  return content === 'percent' ? [valueText] : [nameText, valueText];
}

function createTick(
  context: ChartRenderContext,
  mark: PieLabelMark,
  tickStart: { x: number; y: number },
  tickEnd: { x: number; y: number },
  color: string,
  outside: boolean,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-pie-label-tick-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    bounds,
    d: `M ${tickStart.x} ${tickStart.y} L ${tickEnd.x} ${tickEnd.y}`,
    detail: { of: 'chartSeries', series: mark.seriesId, mark: 'pie-label-tick' },
    style: outside ? { stroke: { kind: 'solid', color }, strokeWidth: 1.5 } : { stroke: { kind: 'none' } },
  };
}

function createPieLabel(
  context: ChartRenderContext<PieChart>,
  base: PieGeometry,
  mark: PieLabelMark,
): RenderNode[] {
  const config = context.chart.config;
  const geometry = { ...base, centerX: base.centerX + mark.shift.dx, centerY: base.centerY + mark.shift.dy };
  const mid = (mark.start + mark.end) / 2;
  const fontSize = Math.max(9, finite(context.chart.fontSize, 12));
  const percent = Math.round(mark.share * 100);
  const lineHeight = fontSize * 1.2;
  const tickStart = pieArcPoint(geometry, mid, geometry.outerRadius + LEADER_INSET);

  const ringThickness = geometry.outerRadius - geometry.innerRadius;
  const tooThin = ringThickness < lineHeight * 2 + 6;
  const hasManualOffset = mark.labelOffsetX !== 0 || mark.labelOffsetY !== 0;
  const position = config?.pieLabelPosition ?? 'auto';
  const outside = hasManualOffset || position === 'outside' || (position === 'auto' && tooThin);

  if (outside) {
    const point = hasManualOffset
      ? addOffset(pieArcPoint(geometry, mid, geometry.outerRadius), mark.labelOffsetX, mark.labelOffsetY)
      : pieArcPoint(
          geometry,
          mid,
          geometry.outerRadius +
            OUTSIDE_GAP +
            (position === 'outside'
              ? Math.abs(Math.cos(mid)) * (config?.pieLabelContent === 'inline' ? LABEL_WIDTH * 0.95 : LABEL_WIDTH / 2)
              : 0),
        );
    const tickEnd = clipSegmentToRect(tickStart, point, LABEL_WIDTH / 2, lineHeight);
    const color =
      config?.pieLabelColor ??
      sameHueTint(representativeColor(mark.color, OUTSIDE_FALLBACK_COLOR), OUTSIDE_TINT_LIGHTNESS) ??
      OUTSIDE_FALLBACK_COLOR;
    const tick = createTick(context, mark, tickStart, tickEnd, color, true);
    return [tick, ...labelTextPair(context, mark, point, color, fontSize, percent, true, mid)];
  }

  const labelRadius = geometry.innerRadius + ringThickness * LABEL_RADIUS_FRACTION;
  const point = pieArcPoint(geometry, mid, labelRadius);
  const color = config?.pieLabelColor ?? sameHueContrastColor(representativeColor(mark.color, '#0f172a'), '#0f172a');
  const tick = createTick(context, mark, tickStart, tickStart, color, false);
  return [tick, ...labelTextPair(context, mark, point, color, fontSize, percent, false, mid)];
}

function addOffset(point: { x: number; y: number }, dx: number, dy: number): { x: number; y: number } {
  return { x: point.x + dx, y: point.y + dy };
}
