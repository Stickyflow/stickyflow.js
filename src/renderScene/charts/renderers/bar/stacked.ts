import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { barCategoryCount, barShapePath, CHART_COLORS, resolveChartShadow, stackedSegment } from '../../primitives';
import { createBarGlowNode } from './glow';
import { barLabelsEnabled, createBarLabelNodes } from './labels';
import { seriesValueColorProp, seriesValueProp } from '../../propPath';
import type { ChartRenderContext, StackedMode } from '../types';

export function renderStackedBars(context: ChartRenderContext, mode: StackedMode): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const glowNodes: RenderNode[] = [];
  const labelNodes: RenderNode[] = [];
  const glow = finite(chart.config?.barGlow, 0);
  const valueCount = barCategoryCount(chart);
  const slotWidth = plot.width / valueCount;
  const groupGap = Math.min(Math.max(0, finite(chart.config?.barGroupGap, 8)), Math.max(0, slotWidth - 1));
  const barWidth = Math.max(1, slotWidth - groupGap);
  const cornerRadius = chart.config?.barCornerRadius ?? 2;
  const outerSeriesIndex = mode === 'waterfall' ? null : chart.series.length - 1;
  const shadow = resolveChartShadow(chart.shadowStyle);
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;

  for (let valueIndex = 0; valueIndex < valueCount; valueIndex++) {
    chart.series.forEach((series, seriesIndex) => {
      const color = series.colors?.[valueIndex] ?? series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const segment = stackedSegment(chart, mode, valueIndex, seriesIndex, plot.height);
      const radius = outerSeriesIndex === null || seriesIndex === outerSeriesIndex ? cornerRadius : 0;
      const x = plot.x + valueIndex * slotWidth + groupGap / 2;
      const y = plot.y + plot.height - Math.max(segment.pixelStart, segment.pixelEnd);
      const height = Math.max(1, Math.abs(segment.pixelEnd - segment.pixelStart));
      const barPath = barShapePath(x, y, barWidth, height, radius);
      const fill = paint(color, diagnostics, chart.id);
      const stroke = paint(chart.config?.barBorderColor || '#000000', diagnostics, chart.id);
      const strokeWidth = finite(chart.config?.barBorderWidth, 0);

      if (shadow && clipPath) {
        nodes.push({
          type: 'path',
          id: `chart-bar-shadow-${chart.id}-${series.id}-${valueIndex}`,
          order: nextOrder(),
          bounds,
          d: barPath,
          style: { fill, stroke, strokeWidth, shadow, clip: { type: 'path', d: clipPath } },
        });
      }
      nodes.push({
        type: 'path',
        id: `chart-bar-${chart.id}-${series.id}-${valueIndex}`,
        order: nextOrder(),
        bounds,
        d: barPath,
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
      if (barLabelsEnabled(context)) {
        const requested = chart.config?.barLabelPosition ?? 'outside';
        const value = series.values[valueIndex];
        labelNodes.push(
          ...createBarLabelNodes(context, {
            id: `chart-bar-label-${chart.id}-${series.id}-${valueIndex}`,
            value: Array.isArray(value) ? value[1] : (value ?? 0),
            frame: { x, y, width: barWidth, height },
            placement: requested === 'outside' && seriesIndex !== outerSeriesIndex ? 'center' : requested,
          }),
        );
      }
      if (glow > 0) {
        glowNodes.push(
          createBarGlowNode(context, `chart-bar-glow-${chart.id}-${series.id}-${valueIndex}`, barPath, color, glow),
        );
      }
    });
  }
  return [...nodes, ...glowNodes, ...labelNodes];
}
