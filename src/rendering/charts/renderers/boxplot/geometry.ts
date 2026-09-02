import { mapChartValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { BoxplotGeometry, BoxplotLayout, BoxplotStats } from './types';

export function createBoxplotGeometry(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  seriesIndex: number,
  stats: BoxplotStats,
): BoxplotGeometry {
  const { chart, plot } = context;
  const valueY = (value: number): number => plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height);
  return {
    centerX: plot.x + seriesIndex * layout.slotWidth + layout.slotWidth / 2,
    minY: valueY(stats.min),
    q1Y: valueY(stats.q1),
    medianY: valueY(stats.median),
    q3Y: valueY(stats.q3),
    maxY: valueY(stats.max),
  };
}
