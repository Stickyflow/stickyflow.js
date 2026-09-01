import type { SflValue } from '../../../ast';
import { asNumber } from '../../readers';
import type { ChartSeries } from './types';

function asComponents(value: SflValue): number[] | undefined {
  if (value.type !== 'list' || value.values.length < 2) {
    return undefined;
  }
  const components = value.values.map(asNumber);
  return components.every((part): part is number => part !== undefined) ? components : undefined;
}

export function readSeriesValues(value?: SflValue): ChartSeries['values'] {
  if (value?.type !== 'list') {
    return [];
  }

  const scalars: number[] = [];
  const tuples: number[][] = [];
  let shape: 'scalar' | 'tuple' | undefined;

  for (const item of value.values) {
    if (item.type === 'number') {
      shape ??= 'scalar';
      if (shape === 'scalar') {
        scalars.push(item.value);
      }
      continue;
    }
    const components = asComponents(item);
    if (components === undefined) {
      continue;
    }
    shape ??= 'tuple';
    if (shape === 'tuple') {
      tuples.push(components);
    }
  }

  return shape === 'tuple' ? (tuples as ChartSeries['values']) : scalars;
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
