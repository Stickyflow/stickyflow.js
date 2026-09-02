import type { Chart, ChartSeries } from '../../../model/charts';
import { mapChartValue } from '../primitives';
import type { ChartRenderContext } from './types';

export interface CartesianPoint {
  x: number;
  y: number;
}

export function seriesValuePairs(chart: Chart, series: ChartSeries): [number, number][] {
  if (series.values.length > 0 && Array.isArray(series.values[0])) {
    return series.values as [number, number][];
  }
  return (series.values as number[]).map((value, index) => [chart.axis_x.min + index * chart.axis_x.step, value]);
}

export function pixelPoints(context: ChartRenderContext, pairs: [number, number][]): CartesianPoint[] {
  const { chart, plot } = context;
  return pairs.map(([x, y]) => ({
    x: plot.x + mapChartValue(x, chart.axis_x, plot.width),
    y: plot.y + plot.height - mapChartValue(y, chart.axis_y, plot.height),
  }));
}
