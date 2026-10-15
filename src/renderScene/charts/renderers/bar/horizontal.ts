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

export function renderHorizontalBars(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, diagnostics, nextOrder } = context;
  const config = chart.config;
  const rows = horizontalRows(chart, plot);
  const seriesCount = Math.max(1, chart.series.length);
  const stacked = context.stackedMode;
  const barGap = Math.max(0, finite(config?.barGap, 2));
  const glow = finite(config?.barGlow, 0);
  const stroke = paint(config?.barBorderColor || '#000000', diagnostics, chart.id);
  const strokeWidth = finite(config?.barBorderWidth, 0);
  const shadow = resolveChartShadow(chart.shadowStyle);
  const tracks: RenderNode[] = [];
  const bars: RenderNode[] = [];
  const glows: RenderNode[] = [];
  const labels: RenderNode[] = [];

  const frameOf = (seriesIndex: number, valueIndex: number, value: number): Frame => {
    const top = rowTop(rows, plot, valueIndex) + rows.labelRow;
    if (stacked) {
      const segment = stackedSegment(chart, stacked, valueIndex, seriesIndex, plot.width);
      const start = Math.min(segment.pixelStart, segment.pixelEnd);
      return {
        x: plot.x + start,
        y: top,
        width: Math.max(1, Math.abs(segment.pixelEnd - segment.pixelStart)),
        height: rows.barsHeight,
      };
    }
    const seriesHeight = rows.barsHeight / seriesCount;
    const width = Math.max(0, mapChartValue(value, chart.axisY, plot.width));
    return { x: plot.x, y: top + seriesIndex * seriesHeight, width, height: Math.max(1, seriesHeight - barGap) };
  };

  chart.series.forEach((series, seriesIndex) => {
    const numeric = series.values.map(value => (typeof value === 'number' ? value : value[1]));
    const highest = Math.max(...numeric);
    numeric.forEach((value, valueIndex) => {
      const color = series.colors?.[valueIndex] ?? series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const frame = frameOf(seriesIndex, valueIndex, value);
      const id = `${series.id}-${valueIndex}`;
      const barBounds = {
        minX: frame.x,
        maxX: frame.x + Math.max(frame.width, 1),
        minY: frame.y,
        maxY: frame.y + frame.height,
      };
      const segments = stacked && chart.series.length > 1 ? 0 : finite(config?.barSegments, 0);
      const d =
        segments > 0
          ? segmentedBarPath(
              { x: plot.x, y: frame.y, width: plot.width, height: frame.height },
              'horizontal',
              segments,
              finite(config?.barSegmentGap, 4),
              config?.barCornerRadius ?? 2,
              frame.width / plot.width,
              config?.barSegmentSnap !== false,
            )
          : roundedBarPath(frame.x, frame.y, frame.width, frame.height, config?.barCornerRadius ?? 2);

      if (barTrackEnabled(context) && (!stacked || seriesIndex === 0)) {
        tracks.push(
          ...createBarTrackNodes(
            context,
            id,
            { x: plot.x, y: frame.y, width: plot.width, height: frame.height },
            'horizontal',
          ),
        );
      }
      const fill = paint(color, diagnostics, chart.id);
      bars.push(...createGlassBackdropNodes(context, id, d));
      if (shadow) {
        bars.push({
          type: 'path',
          id: `chart-bar-shadow-${chart.id}-${id}`,
          order: nextOrder(),
          bounds: barBounds,
          d,
          style: {
            fill,
            stroke,
            strokeWidth,
            shadow,
            clip: barTrackClip(context, { x: plot.x, y: frame.y, width: plot.width, height: frame.height }),
          },
        });
      }
      bars.push({
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
      if (glow > 0 && frame.width > 0) {
        glows.push(createBarGlowNode(context, `chart-bar-glow-${chart.id}-${id}`, d, color, glow, barBounds));
      }
      const showLabel = barLabelsEnabled(context) && (!config?.barLabelMaxOnly || value >= highest);
      if (
        showLabel &&
        (!stacked || seriesIndex === chart.series.length - 1 || config?.barLabelPosition !== 'outside')
      ) {
        labels.push(
          ...createBarLabelNodes(context, {
            id: `chart-bar-label-${chart.id}-${id}`,
            value,
            frame,
            placement: config?.barLabelPosition ?? 'outside',
            horizontal: true,
          }),
        );
      }
    });
  });
  return [...tracks, ...bars, ...glows, ...labels];
}
