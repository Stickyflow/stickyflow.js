import type { Chart } from '../../../model/chart';
import { mapChartValue } from './axis';

interface StackedSegment {
  value: number;
  pixelStart: number;
  pixelEnd: number;
}

export function stackedSegment(
  chart: Chart,
  mode: 'true' | 'percent' | 'waterfall',
  categoryIndex: number,
  seriesIndex: number,
  plotHeight: number,
): StackedSegment {
  const value = (chart.series[seriesIndex].values as number[])[categoryIndex] ?? 0;
  if (mode === 'waterfall') {
    return waterfallSegment(chart, categoryIndex, seriesIndex, plotHeight, value);
  }
  if (mode === 'percent') {
    return percentSegment(chart, categoryIndex, seriesIndex, plotHeight, value);
  }
  return cumulativeSegment(chart, categoryIndex, seriesIndex, plotHeight, value);
}

function waterfallSegment(
  chart: Chart,
  categoryIndex: number,
  seriesIndex: number,
  plotHeight: number,
  value: number,
): StackedSegment {
  let running = 0;
  for (let index = 0; index < categoryIndex; index++) {
    running += (chart.series[seriesIndex].values as number[])[index] ?? 0;
  }
  return mappedSegment(value, running, running + value, chart, plotHeight);
}

function percentSegment(
  chart: Chart,
  categoryIndex: number,
  seriesIndex: number,
  plotHeight: number,
  value: number,
): StackedSegment {
  const total =
    chart.series.reduce((sum, series) => sum + Math.abs((series.values as number[])[categoryIndex] ?? 0), 0) || 1;
  let cumulative = 0;
  for (let index = 0; index < seriesIndex; index++) {
    cumulative += Math.abs((chart.series[index].values as number[])[categoryIndex] ?? 0);
  }
  const magnitude = Math.abs(value);
  return {
    value,
    pixelStart: (cumulative / total) * plotHeight,
    pixelEnd: ((cumulative + magnitude) / total) * plotHeight,
  };
}

function cumulativeSegment(
  chart: Chart,
  categoryIndex: number,
  seriesIndex: number,
  plotHeight: number,
  value: number,
): StackedSegment {
  let cumulative = 0;
  for (let index = 0; index < seriesIndex; index++) {
    cumulative += (chart.series[index].values as number[])[categoryIndex] ?? 0;
  }
  return mappedSegment(value, cumulative, cumulative + value, chart, plotHeight);
}

function mappedSegment(value: number, start: number, end: number, chart: Chart, plotHeight: number): StackedSegment {
  return {
    value,
    pixelStart: mapChartValue(start, chart.axisY, plotHeight),
    pixelEnd: mapChartValue(end, chart.axisY, plotHeight),
  };
}
