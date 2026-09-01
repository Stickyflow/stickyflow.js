import type { SflValue } from '../../../ast';
import { asNumber } from '../../readers';
import type { ChartSeries } from './types';

export function readSeriesValues(value?: SflValue): ChartSeries['values'] {
  const values: number[] | number[][] = [];
  if (value?.type !== 'list') {
    return values as ChartSeries['values'];
  }
  for (const item of value.values) {
    if (item.type === 'number') {
      (values as number[]).push(item.value);
    } else if (item.type === 'list') {
      const components = item.values.map(asNumber);
      if (components.length >= 2 && components.every((part): part is number => part !== undefined)) {
        (values as number[][]).push(components);
      }
    }
  }
  return values as ChartSeries['values'];
}

export function readSeriesErrors(value?: SflValue): ChartSeries['error'] {
  if (value?.type !== 'list') {
    return undefined;
  }
  return value.values.map(item => {
    if (item.type === 'ident' && item.segments.join('.') === 'none') {
      return null;
    }
    if (item.type === 'number') {
      return item.value;
    }
    if (item.type === 'list' && item.values.length >= 2) {
      const low = asNumber(item.values[0]);
      const high = asNumber(item.values[1]);
      if (low !== undefined && high !== undefined) {
        return [low, high] as [number, number];
      }
    }
    return null;
  });
}

export function readSeriesSymbol(value?: SflValue): ChartSeries['symbol'] {
  if (value?.type !== 'list') {
    return undefined;
  }
  const points = value.values.flatMap((item): Array<[number, number]> => {
    if (item.type !== 'list' || item.values.length < 2) {
      return [];
    }
    const x = asNumber(item.values[0]);
    const y = asNumber(item.values[1]);
    return x === undefined || y === undefined ? [] : [[x, y]];
  });
  return points.length > 0 ? { points } : undefined;
}
