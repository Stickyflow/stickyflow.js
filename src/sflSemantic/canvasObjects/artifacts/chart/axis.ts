import type { SflBlock, SflValue } from '../../../../sflLanguage/ast';
import { directProperties } from '../../../ast/blockEntries';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { ChartData } from './types';
import { numberList } from './values';

export function readAxis(block?: SflBlock): ChartData['axisX'] {
  const properties = block ? directProperties(block) : new Map<string, SflValue>();
  return {
    min: asNumber(properties.get('min')) ?? 0,
    max: asNumber(properties.get('max')) ?? 10,
    step: asNumber(properties.get('step')) ?? 1,
    label: asString(properties.get('label')),
    unit: asString(properties.get('unit')),
    thresholds: numberList(properties.get('thresholds')),
  };
}
