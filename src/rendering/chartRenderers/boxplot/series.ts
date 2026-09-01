import type { ChartSeries } from '../../../model/charts';
import { CHART_COLORS, computeBoxplotStats } from '../../chartPrimitives';
import type { RenderNode } from '../../renderScene';
import type { ChartRenderContext } from '../types';
import { createBoxplotGeometry } from './geometry';
import { renderSamplePoints } from './points';
import { renderBoxAndWhiskers } from './shapes';
import type { BoxplotLayout } from './types';

export function renderBoxplotSeries(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  series: ChartSeries,
  seriesIndex: number,
): RenderNode[] {
  const stats = computeBoxplotStats(series.values as number[]);
  if (!stats) {
    return [];
  }

  const geometry = createBoxplotGeometry(context, layout, seriesIndex, stats);
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const id = `${context.chart.id}-${series.id}`;
  const nodes = renderBoxAndWhiskers(context, layout, geometry, id, color);
  if (layout.showPoints) {
    nodes.push(...renderSamplePoints(context, layout, geometry, series, seriesIndex, id, color));
  }
  return nodes;
}
