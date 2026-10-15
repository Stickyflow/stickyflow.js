import type { ChartSeries } from '../../../model/chart';

export function barCategoryCount(chart: { series: ChartSeries[]; config?: { categories?: string[] } }): number {
  return Math.max(1, chart.config?.categories?.length ?? 0, ...chart.series.map(series => series.values.length));
}
