import type { SflBlock, SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase, SflSymbolDefinition } from '../../types';
import type { SflChartObject } from './object';
import { readChart } from './reader';

export function resolveChartObject(
  base: SflCanvasObjectBase,
  block: SflBlock,
  properties: Map<string, SflValue>,
  symbolDefinitions: Map<string, SflSymbolDefinition>,
  mergedProperties: (block: SflBlock) => Map<string, SflValue>,
): SflChartObject {
  return {
    ...base,
    objectType: 'chart',
    chart: readChart(block, properties, symbolDefinitions, mergedProperties),
  };
}
