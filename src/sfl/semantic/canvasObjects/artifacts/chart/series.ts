import type { SflBlock } from '../../../../ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import { readSeriesColors, readSeriesErrors, readSeriesSymbol, readSeriesValues } from './seriesValues';
import type { ChartProperties, ChartSeries } from './types';

type SymbolDefinitions = Map<string, { points: Array<[number, number]>; tension?: number }>;

export function readSeries(
  block: SflBlock,
  symbolDefs: SymbolDefinitions,
  mergedProps: (block: SflBlock) => ChartProperties,
): ChartSeries {
  const properties = mergedProps(block);
  return {
    id: block.name,
    label: asString(properties.get('label')) ?? block.name,
    color: asString(properties.get('color')),
    colors: readSeriesColors(properties.get('colors')),
    opacity: asNumber(properties.get('opacity')),
    group: asString(properties.get('group')),
    values: readSeriesValues(properties.get('values')),
    error: readSeriesErrors(properties.get('error')),
    source: asString(properties.get('source')),
    target: asString(properties.get('target')),
    size: asNumber(properties.get('size')),
    symbol: readSeriesSymbol(properties.get('symbol'), symbolDefs),
    stroke: asString(properties.get('stroke')),
    strokeWidth: asNumber(properties.get('strokeWidth')),
    labelOffsetX: asNumber(properties.get('labelOffsetX')),
    labelOffsetY: asNumber(properties.get('labelOffsetY')),
  };
}
