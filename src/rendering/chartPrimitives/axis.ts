import type { ChartAxis } from '../../model/charts';

export function mapChartValue(value: number, axis: ChartAxis, extent: number): number {
  if (axis.max === axis.min) {
    return 0;
  }
  return ((value - axis.min) / (axis.max - axis.min)) * extent;
}

export function chartTicks(axis: ChartAxis): number[] {
  if (!(axis.step > 0)) {
    return axis.min === axis.max ? [axis.min] : [axis.min, axis.max];
  }

  const ticks: number[] = [];
  for (let value = axis.min; value <= axis.max + 1e-9 && ticks.length < 1000; value += axis.step) {
    ticks.push(Math.round(value * 1000) / 1000);
  }
  return ticks;
}

export function axisBands(axis: ChartAxis): number[] {
  const thresholds = [...(axis.thresholds ?? [])]
    .filter(threshold => threshold > axis.min && threshold < axis.max)
    .sort((a, b) => a - b);
  return [axis.min, ...thresholds, axis.max];
}

export function bandIndexForValue(value: number, bands: number[]): number {
  for (let index = 0; index < bands.length - 2; index++) {
    if (value < bands[index + 1]) {
      return index;
    }
  }
  return Math.max(0, bands.length - 2);
}
