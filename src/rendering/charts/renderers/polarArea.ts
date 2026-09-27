import type { RenderNode } from '../../scene';
import { finite, paint } from '../../scene';
import { CHART_COLORS, createPieSlicePath, gapInsetAngle, maxPieCornerRadius, pieUsesInnerArc } from '../primitives';
import { seriesValueProp } from '../propPath';
import type { ChartRenderContext } from './types';

const START_ANGLE = -Math.PI / 2;

export function renderPolarArea(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const centerX = plot.x + plot.width / 2;
  const centerY = plot.y + plot.height / 2;
  const maxRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
  const innerRadius = Math.max(0, Math.min(finite(chart.config?.innerRadius, 0), maxRadius - 1));
  const cornerRadius = Math.max(0, finite(chart.config?.pieCornerRadius, 0));
  const gapPx = Math.max(0, finite(chart.config?.pieSliceGap, 0));
  const axisMin = finite(chart.axis_y.min, 0);
  const range = finite(chart.axis_y.max, 100) - axisMin;
  const seriesList = chart.series;
  const sweep = seriesList.length > 0 ? (Math.PI * 2) / seriesList.length : 0;

  return seriesList.map((series, index): RenderNode => {
    const angles = { start: START_ANGLE + index * sweep, end: START_ANGLE + (index + 1) * sweep };
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const fraction = range > 0 ? Math.min(1, Math.max(0, (value - axisMin) / range)) : 0;
    const outerRadius = Math.max(innerRadius + 1, innerRadius + (maxRadius - innerRadius) * fraction);
    const geometry = { centerX, centerY, outerRadius, innerRadius };
    const boundaryRadius = pieUsesInnerArc(geometry, angles, gapPx) ? innerRadius : 0;
    const availableSweep = Math.max(0, sweep - 2 * gapInsetAngle(Math.max(0, gapPx) / 2, outerRadius));
    const clampedCorner = Math.min(cornerRadius, maxPieCornerRadius(outerRadius, boundaryRadius, availableSweep));
    const color = paint(series.color ?? CHART_COLORS[index % CHART_COLORS.length], diagnostics, chart.id);
    return {
      type: 'path',
      id: `chart-polar-area-wedge-${chart.id}-${series.id}`,
      order: nextOrder(),
      bounds,
      d: createPieSlicePath(geometry, angles, clampedCorner, gapPx),
      detail: {
        of: 'chartValue',
        series: series.id,
        valueIndex: 0,
        mark: 'polar-area-wedge',
        pieStart: angles.start,
        pieEnd: angles.end,
        pieValue: value,
      },
      prop: seriesValueProp(series.id, 0),
      style: { fill: color },
    };
  });
}
