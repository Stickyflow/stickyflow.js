import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import {
  barCategoryCount,
  barPath,
  CHART_COLORS,
  resolveChartShadow,
  segmentedBarPath,
  stackedSegment,
} from '../../primitives';
import { seriesValueColorProp, seriesValueProp } from '../../propPath';
import type { ChartRenderContext, StackedMode } from '../types';
import { createGlassBackdropNodes } from './glass';
import { createBarGlowNode } from './glow';
import { barLabelsEnabled, createBarLabelNodes } from './labels';
import { barTrackClip, barTrackEnabled, createBarTrackNodes } from './track';

interface Layers {
  tracks: RenderNode[];
  bars: RenderNode[];
  glows: RenderNode[];
  labels: RenderNode[];
}

interface Slot {
  slotWidth: number;
  groupGap: number;
  barWidth: number;
  cornerRadius: number;
  outerSeriesIndex: number | null;
}

function slotOf(context: ChartRenderContext, mode: StackedMode): Slot {
  const { chart, plot } = context;
  const slotWidth = plot.width / barCategoryCount(chart);
  const groupGap = Math.min(Math.max(0, finite(chart.config?.barGroupGap, 8)), Math.max(0, slotWidth - 1));
  return {
    slotWidth,
    groupGap,
    barWidth: Math.max(1, slotWidth - groupGap),
    cornerRadius: chart.config?.barCornerRadius ?? 2,
    outerSeriesIndex: mode === 'waterfall' ? null : chart.series.length - 1,
  };
}

function pathOf(context: ChartRenderContext, x: number, y: number, height: number, slot: Slot, radius: number): string {
  const { chart, plot } = context;
  const segments = chart.series.length === 1 ? finite(chart.config?.barSegments, 0) : 0;
  if (segments > 0) {
    return segmentedBarPath(
      { x, y: plot.y, width: slot.barWidth, height: plot.height },
      'vertical',
      segments,
      finite(chart.config?.barSegmentGap, 4),
      radius,
      height / plot.height,
      chart.config?.barSegmentSnap !== false,
    );
  }
  return barPath(x, y, slot.barWidth, height, radius, chart.config?.barRoundedBottom === true);
}

function pushLabel(
  context: ChartRenderContext,
  layers: Layers,
  series: ChartSeries,
  seriesIndex: number,
  valueIndex: number,
  slot: Slot,
  frame: { x: number; y: number; width: number; height: number },
): void {
  const { chart } = context;
  const config = chart.config;
  const visible =
    barLabelsEnabled(context) &&
    !(config?.barLabelMaxOnly && !isSeriesMax(series.values, valueIndex)) &&
    (config?.barLabelPosition !== 'axis' || seriesIndex === slot.outerSeriesIndex);
  if (!visible) {
    return;
  }
  const requested = config?.barLabelPosition ?? 'outside';
  const value = series.values[valueIndex];
  layers.labels.push(
    ...createBarLabelNodes(context, {
      id: `chart-bar-label-${chart.id}-${series.id}-${valueIndex}`,
      value: Array.isArray(value) ? value[1] : (value ?? 0),
      frame,
      placement: requested === 'outside' && seriesIndex !== slot.outerSeriesIndex ? 'center' : requested,
    }),
  );
}

function pushSegment(
  context: ChartRenderContext,
  mode: StackedMode,
  layers: Layers,
  slot: Slot,
  series: ChartSeries,
  seriesIndex: number,
  valueIndex: number,
): void {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const color = series.colors?.[valueIndex] ?? series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const segment = stackedSegment(chart, mode, valueIndex, seriesIndex, plot.height);
  const radius = slot.outerSeriesIndex === null || seriesIndex === slot.outerSeriesIndex ? slot.cornerRadius : 0;
  const x = plot.x + valueIndex * slot.slotWidth + slot.groupGap / 2;
  const y = plot.y + plot.height - Math.max(segment.pixelStart, segment.pixelEnd);
  const height = Math.max(1, Math.abs(segment.pixelEnd - segment.pixelStart));
  const path = pathOf(context, x, y, height, slot, radius);
  const column = { x, y: plot.y, width: slot.barWidth, height: plot.height };
  if (seriesIndex === 0 && barTrackEnabled(context)) {
    layers.tracks.push(...createBarTrackNodes(context, String(valueIndex), column));
  }
  const fill = paint(color, diagnostics, chart.id);
  const stroke = paint(chart.config?.barBorderColor || '#000000', diagnostics, chart.id);
  const strokeWidth = finite(chart.config?.barBorderWidth, 0);
  const shadow = resolveChartShadow(chart.shadowStyle);

  if (shadow) {
    const plotClip = `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`;
    layers.bars.push({
      type: 'path',
      id: `chart-bar-shadow-${chart.id}-${series.id}-${valueIndex}`,
      order: nextOrder(),
      bounds,
      d: path,
      style: {
        fill,
        stroke,
        strokeWidth,
        shadow,
        clip: barTrackClip(context, column) ?? { type: 'path', d: plotClip },
      },
    });
  }
  layers.bars.push(...createGlassBackdropNodes(context, `${series.id}-${valueIndex}`, path));
  layers.bars.push({
    type: 'path',
    id: `chart-bar-${chart.id}-${series.id}-${valueIndex}`,
    order: nextOrder(),
    bounds,
    d: path,
    detail: {
      of: 'chartValue',
      series: series.id,
      valueIndex,
      mark: 'bar',
      radius,
      colorProp: seriesValueColorProp(series.id, valueIndex),
      hasColorOverride: series.colors?.[valueIndex] != null,
    },
    prop: seriesValueProp(series.id, valueIndex),
    style: { fill, stroke, strokeWidth, innerShadow: shadow },
  });
  pushLabel(context, layers, series, seriesIndex, valueIndex, slot, { x, y, width: slot.barWidth, height });
  const glow = finite(chart.config?.barGlow, 0);
  if (glow > 0) {
    layers.glows.push(
      createBarGlowNode(context, `chart-bar-glow-${chart.id}-${series.id}-${valueIndex}`, path, color, glow),
    );
  }
}

export function renderStackedBars(context: ChartRenderContext, mode: StackedMode): RenderNode[] {
  const { chart } = context;
  const layers: Layers = { tracks: [], bars: [], glows: [], labels: [] };
  const slot = slotOf(context, mode);
  const valueCount = barCategoryCount(chart);
  for (let valueIndex = 0; valueIndex < valueCount; valueIndex++) {
    chart.series.forEach((series, seriesIndex) => {
      pushSegment(context, mode, layers, slot, series, seriesIndex, valueIndex);
    });
  }
  return [...layers.tracks, ...layers.bars, ...layers.glows, ...layers.labels];
}

function isSeriesMax(values: ReadonlyArray<number | readonly number[]>, index: number): boolean {
  const numeric = values.map(value => (typeof value === 'number' ? value : value[1]));
  return numeric[index] >= Math.max(...numeric);
}
