import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { CHART_COLORS, computeBoxplotStats } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { createBoxplotGeometry } from './geometry';
import { renderSamplePoints } from './points';
import { renderBoxAndWhiskers } from './shapes';
import type { BoxplotLayout, BoxplotSeriesMark } from './types';

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
  const mark: BoxplotSeriesMark = {
    id: `${context.chart.id}-${series.id}`,
    series,
    seriesIndex,
    color,
    geometry,
  };
  const nodes = renderBoxAndWhiskers(context, layout, mark);
  if (layout.showPoints) {
    nodes.push(...renderSamplePoints(context, layout, mark));
  }
  return nodes;
}
