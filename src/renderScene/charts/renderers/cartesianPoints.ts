import type { Chart, ChartSeries } from '../../../model/chart';
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
  return (series.values as number[]).map((value, index) => [chart.axisX.min + index * chart.axisX.step, value]);
}

export function pixelPoints(context: ChartRenderContext, pairs: [number, number][]): CartesianPoint[] {
  const { chart, plot } = context;
  return pairs.map(([x, y]) => ({
    x: plot.x + mapChartValue(x, chart.axisX, plot.width),
    y: plot.y + plot.height - mapChartValue(y, chart.axisY, plot.height),
  }));
}
