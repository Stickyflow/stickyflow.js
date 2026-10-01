import type { ChartAxis, ChartZone } from '../../../model/charts';
import { interpolateHexColorStops } from '../../../model/colorInterpolation';
import { DEFAULT_ZONE_FILL } from './defaults';

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

  const ascending = axis.min <= axis.max;
  const step = ascending ? axis.step : -axis.step;
  const ticks: number[] = [];
  for (
    let value = axis.min;
    (ascending ? value <= axis.max + 1e-9 : value >= axis.max - 1e-9) && ticks.length < 1000;
    value += step
  ) {
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

export function zoneColorAtValue(value: number, bands: number[], zones: ChartZone[]): string {
  const bandCount = Math.max(0, bands.length - 1);
  const stops = zones.slice(0, bandCount).map((zone, index) => ({
    position: bands[index + 1] ?? bands[bands.length - 1],
    color: zone.color ?? DEFAULT_ZONE_FILL,
  }));
  if (!stops.length) {
    return DEFAULT_ZONE_FILL;
  }
  return interpolateHexColorStops(stops, value);
}
