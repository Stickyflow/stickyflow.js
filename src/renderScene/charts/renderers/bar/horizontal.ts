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

interface BarMark {
  id: string;
  series: ChartSeries;
  seriesIndex: number;
  valueIndex: number;
  value: number;
  frame: Frame;
  trackFrame: Frame;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  path: string;
  color: NonNullable<ChartSeries['color']>;
}

function markOf(
  context: ChartRenderContext,
  rows: Rows,
  series: ChartSeries,
  seriesIndex: number,
  valueIndex: number,
  value: number,
): BarMark {
  const { plot } = context;
  const frame = barFrame(context, rows, seriesIndex, valueIndex, value);
  return {
    id: `${series.id}-${valueIndex}`,
    series,
    seriesIndex,
    valueIndex,
    value,
    frame,
    trackFrame: { x: plot.x, y: frame.y, width: plot.width, height: frame.height },
    bounds: {
      minX: frame.x,
      maxX: frame.x + Math.max(frame.width, 1),
      minY: frame.y,
      maxY: frame.y + frame.height,
    },
    path: barPath(context, frame),
    color: series.colors?.[valueIndex] ?? series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length],
  };
}

function barNodes(context: ChartRenderContext, mark: BarMark): RenderNode[] {
  const { chart, diagnostics, nextOrder } = context;
  const config = chart.config;
  const stroke = paint(config?.barBorderColor || '#000000', diagnostics, chart.id);
  const strokeWidth = finite(config?.barBorderWidth, 0);
  const shadow = resolveChartShadow(chart.shadowStyle);
  const fill = paint(mark.color, diagnostics, chart.id);
  const nodes: RenderNode[] = [...createGlassBackdropNodes(context, mark.id, mark.path)];
  if (shadow) {
    nodes.push({
      type: 'path',
      id: `chart-bar-shadow-${chart.id}-${mark.id}`,
      order: nextOrder(),
      bounds: mark.bounds,
      d: mark.path,
      style: { fill, stroke, strokeWidth, shadow, clip: barTrackClip(context, mark.trackFrame) },
    });
  }
  nodes.push({
    type: 'path',
    id: `chart-bar-${chart.id}-${mark.id}`,
    order: nextOrder(),
    bounds: mark.bounds,
    d: mark.path,
    detail: {
      of: 'chartValue',
      series: mark.series.id,
      valueIndex: mark.valueIndex,
      mark: 'bar',
      radius: config?.barCornerRadius ?? 2,
      colorProp: seriesValueColorProp(mark.series.id, mark.valueIndex),
      hasColorOverride: mark.series.colors?.[mark.valueIndex] != null,
    },
    style: { fill, stroke, strokeWidth, innerShadow: shadow },
  });
  return nodes;
}

function labelNodes(context: ChartRenderContext, mark: BarMark, highest: number): RenderNode[] {
  const { chart } = context;
  const config = chart.config;
  const showLabel = barLabelsEnabled(context) && (!config?.barLabelMaxOnly || mark.value >= highest);
  const lastSeries = mark.seriesIndex === chart.series.length - 1;
  if (!showLabel || (context.stackedMode && !lastSeries && config?.barLabelPosition === 'outside')) {
    return [];
  }
  return createBarLabelNodes(context, {
    id: `chart-bar-label-${chart.id}-${mark.id}`,
    value: mark.value,
    frame: mark.frame,
    placement: config?.barLabelPosition ?? 'outside',
    horizontal: true,
  });
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
  const { chart } = context;
  const mark = markOf(context, rows, series, seriesIndex, valueIndex, value);
  if (barTrackEnabled(context) && (!context.stackedMode || seriesIndex === 0)) {
    layers.tracks.push(...createBarTrackNodes(context, mark.id, mark.trackFrame, 'horizontal'));
  }
  layers.bars.push(...barNodes(context, mark));
  const glow = finite(chart.config?.barGlow, 0);
  if (glow > 0 && mark.frame.width > 0) {
    layers.glows.push(
      createBarGlowNode(context, `chart-bar-glow-${chart.id}-${mark.id}`, mark.path, mark.color, glow, mark.bounds),
    );
  }
  layers.labels.push(...labelNodes(context, mark, highest));
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
