import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import {
  CHART_COLORS,
  horizontalRows,
  mapChartValue,
  resolveChartShadow,
  roundedBarPath,
  rowTop,
  segmentedBarPath,
  stackedSegment,
} from '../../primitives';
import { seriesValueColorProp } from '../../propPath';
import type { ChartRenderContext } from '../types';
import { createGlassBackdropNodes } from './glass';
import { createBarGlowNode } from './glow';
import { barLabelsEnabled, createBarLabelNodes } from './labels';
import { barTrackClip, barTrackEnabled, createBarTrackNodes } from './track';

interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Rows = ReturnType<typeof horizontalRows>;

interface Layers {
  tracks: RenderNode[];
  bars: RenderNode[];
  glows: RenderNode[];
  labels: RenderNode[];
}

function barFrame(
  context: ChartRenderContext,
  rows: Rows,
  seriesIndex: number,
  valueIndex: number,
  value: number,
): Frame {
  const { chart, plot } = context;
  const top = rowTop(rows, plot, valueIndex) + rows.labelRow;
  if (context.stackedMode) {
    const segment = stackedSegment(chart, context.stackedMode, valueIndex, seriesIndex, plot.width);
    const start = Math.min(segment.pixelStart, segment.pixelEnd);
    return {
      x: plot.x + start,
      y: top,
      width: Math.max(1, Math.abs(segment.pixelEnd - segment.pixelStart)),
      height: rows.barsHeight,
    };
  }
  const barGap = Math.max(0, finite(chart.config?.barGap, 2));
  const seriesHeight = rows.barsHeight / Math.max(1, chart.series.length);
  const width = Math.max(0, mapChartValue(value, chart.axisY, plot.width));
  return { x: plot.x, y: top + seriesIndex * seriesHeight, width, height: Math.max(1, seriesHeight - barGap) };
}

function barPath(context: ChartRenderContext, frame: Frame): string {
  const { chart, plot } = context;
  const config = chart.config;
  const segments = context.stackedMode && chart.series.length > 1 ? 0 : finite(config?.barSegments, 0);
  if (segments > 0) {
    return segmentedBarPath(
      { x: plot.x, y: frame.y, width: plot.width, height: frame.height },
      'horizontal',
      segments,
      finite(config?.barSegmentGap, 4),
      config?.barCornerRadius ?? 2,
      frame.width / plot.width,
      config?.barSegmentSnap !== false,
    );
  }
  return roundedBarPath(frame.x, frame.y, frame.width, frame.height, config?.barCornerRadius ?? 2);
}

function pushBar(
  context: ChartRenderContext,
  rows: Rows,
  layers: Layers,
  series: ChartSeries,
  seriesIndex: number,
  valueIndex: number,
  value: number,
  highest: number,
): void {
  const { chart, plot, diagnostics, nextOrder } = context;
  const config = chart.config;
  const stacked = context.stackedMode;
  const color = series.colors?.[valueIndex] ?? series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const frame = barFrame(context, rows, seriesIndex, valueIndex, value);
  const id = `${series.id}-${valueIndex}`;
  const trackFrame = { x: plot.x, y: frame.y, width: plot.width, height: frame.height };
  const barBounds = {
    minX: frame.x,
    maxX: frame.x + Math.max(frame.width, 1),
    minY: frame.y,
    maxY: frame.y + frame.height,
  };
  const d = barPath(context, frame);
  const stroke = paint(config?.barBorderColor || '#000000', diagnostics, chart.id);
  const strokeWidth = finite(config?.barBorderWidth, 0);
  const shadow = resolveChartShadow(chart.shadowStyle);
  const fill = paint(color, diagnostics, chart.id);

  if (barTrackEnabled(context) && (!stacked || seriesIndex === 0)) {
    layers.tracks.push(...createBarTrackNodes(context, id, trackFrame, 'horizontal'));
  }
  layers.bars.push(...createGlassBackdropNodes(context, id, d));
  if (shadow) {
    layers.bars.push({
      type: 'path',
      id: `chart-bar-shadow-${chart.id}-${id}`,
      order: nextOrder(),
      bounds: barBounds,
      d,
      style: { fill, stroke, strokeWidth, shadow, clip: barTrackClip(context, trackFrame) },
    });
  }
  layers.bars.push({
    type: 'path',
    id: `chart-bar-${chart.id}-${id}`,
    order: nextOrder(),
    bounds: barBounds,
    d,
    detail: {
      of: 'chartValue',
      series: series.id,
      valueIndex,
      mark: 'bar',
      radius: config?.barCornerRadius ?? 2,
      colorProp: seriesValueColorProp(series.id, valueIndex),
      hasColorOverride: series.colors?.[valueIndex] != null,
    },
    style: { fill, stroke, strokeWidth, innerShadow: shadow },
  });
  const glow = finite(config?.barGlow, 0);
  if (glow > 0 && frame.width > 0) {
    layers.glows.push(createBarGlowNode(context, `chart-bar-glow-${chart.id}-${id}`, d, color, glow, barBounds));
  }
  const showLabel = barLabelsEnabled(context) && (!config?.barLabelMaxOnly || value >= highest);
  const lastSeries = seriesIndex === chart.series.length - 1;
  if (showLabel && (!stacked || lastSeries || config?.barLabelPosition !== 'outside')) {
    layers.labels.push(
      ...createBarLabelNodes(context, {
        id: `chart-bar-label-${chart.id}-${id}`,
        value,
        frame,
        placement: config?.barLabelPosition ?? 'outside',
        horizontal: true,
      }),
    );
  }
}

export function renderHorizontalBars(context: ChartRenderContext): RenderNode[] {
  const rows = horizontalRows(context.chart, context.plot);
  const layers: Layers = { tracks: [], bars: [], glows: [], labels: [] };
  context.chart.series.forEach((series, seriesIndex) => {
    const numeric = series.values.map(value => (typeof value === 'number' ? value : value[1]));
    const highest = Math.max(...numeric);
    numeric.forEach((value, valueIndex) => {
      pushBar(context, rows, layers, series, seriesIndex, valueIndex, value, highest);
    });
  });
  return [...layers.tracks, ...layers.bars, ...layers.glows, ...layers.labels];
}
