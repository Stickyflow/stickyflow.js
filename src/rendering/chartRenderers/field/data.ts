import { mapChartValue } from '../../chartPrimitives';
import type { ChartRenderContext } from '../types';
import type { FieldData } from './types';

export function classifyFieldData(context: ChartRenderContext): FieldData {
  const { chart, plot } = context;
  const scalarSeries = chart.series.filter(series => tupleSize(series.values[0]) === 3);
  const vectorSeries = chart.series.filter(series => tupleSize(series.values[0]) === 4);
  const scalarSamples = scalarSeries.flatMap(series =>
    (series.values as [number, number, number][]).map(([x, y, value]) => ({
      x: mapChartValue(x, chart.axis_x, plot.width),
      y: plot.height - mapChartValue(y, chart.axis_y, plot.height),
      value,
    })),
  );

  return { scalarSamples, vectorSeries };
}

function tupleSize(value: unknown): number | undefined {
  return Array.isArray(value) ? value.length : undefined;
}
