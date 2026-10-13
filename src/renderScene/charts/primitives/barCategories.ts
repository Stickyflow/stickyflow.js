import type { ChartSeries } from '../../../model/chart';

// One slot per category, even when the data has not caught up with a category added in the code yet.
export function barCategoryCount(chart: { series: ChartSeries[]; config?: { categories?: string[] } }): number {
  return Math.max(1, chart.config?.categories?.length ?? 0, ...chart.series.map(series => series.values.length));
}
