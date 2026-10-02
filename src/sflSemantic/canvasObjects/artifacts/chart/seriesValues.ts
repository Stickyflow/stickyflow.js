import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { ChartSeries } from './types';

type SeriesValueShape = 'scalar' | 'tuple';
type SeriesError = NonNullable<ChartSeries['error']>[number];

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
  const shape = firstSeriesValueShape(value.values);
  return shape === 'tuple' ? readTupleSeriesValues(value.values) : readScalarSeriesValues(value.values);
}

function firstSeriesValueShape(values: SflValue[]): SeriesValueShape | undefined {
  for (const value of values) {
    if (value.type === 'number') {
      return 'scalar';
    }
    if (asComponents(value)) {
      return 'tuple';
    }
  }
  return undefined;
}

function readScalarSeriesValues(values: SflValue[]): number[] {
  return values.flatMap(value => (value.type === 'number' ? [value.value] : []));
}

function readTupleSeriesValues(values: SflValue[]): ChartSeries['values'] {
  return values.flatMap(value => {
    const components = asComponents(value);
    return components ? [components] : [];
  }) as ChartSeries['values'];
}

export function readSeriesErrors(value?: SflValue): ChartSeries['error'] {
  if (value?.type !== 'list') {
    return undefined;
  }
  return value.values.map(readSeriesError);
}

function readSeriesError(value: SflValue): SeriesError {
  if (value.type === 'ident' && value.segments.join('.') === 'none') {
    return null;
  }
  if (value.type === 'number') {
    return value.value;
  }
  return readSeriesErrorRange(value);
}

function readSeriesErrorRange(value: SflValue): [number, number] | null {
  if (value.type !== 'list' || value.values.length < 2) {
    return null;
  }
  const low = asNumber(value.values[0]);
  const high = asNumber(value.values[1]);
  return low !== undefined && high !== undefined ? [low, high] : null;
}

export function readSeriesColors(value?: SflValue): ChartSeries['colors'] {
  if (value?.type !== 'list') {
    return undefined;
  }
  return value.values.map(readSeriesColor);
}

function readSeriesColor(value: SflValue): string | null {
  if (value.type === 'ident' && value.segments.join('.') === 'none') {
    return null;
  }
  return asString(value) ?? null;
}

type SymbolDefinitions = Map<string, { points: Array<[number, number]>; tension?: number }>;

export function readSeriesSymbol(value: SflValue | undefined, symbolDefs: SymbolDefinitions): ChartSeries['symbol'] {
  if (value?.type === 'list') {
    const points = value.values.flatMap(readSeriesSymbolPoint);
    return points.length > 0 ? { points } : undefined;
  }
  const name = asString(value);
  const definition = name ? symbolDefs.get(name) : undefined;
  if (!definition) {
    return undefined;
  }
  return { points: definition.points, normalized: true, tension: definition.tension };
}

function readSeriesSymbolPoint(value: SflValue): Array<[number, number]> {
  if (value.type !== 'list' || value.values.length < 2) {
    return [];
  }
  const x = asNumber(value.values[0]);
  const y = asNumber(value.values[1]);
  return x === undefined || y === undefined ? [] : [[x, y]];
}
