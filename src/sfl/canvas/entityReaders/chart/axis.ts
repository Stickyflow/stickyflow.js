import type { SflBlock, SflValue } from '../../../ast';
import { asNumber, asString, directProps } from '../../readers';
import type { ChartData } from './types';
import { numberList } from './values';

export function readAxis(block?: SflBlock): ChartData['axisX'] {
  const properties = block ? directProps(block) : new Map<string, SflValue>();
  return {
    min: asNumber(properties.get('min')) ?? 0,
    max: asNumber(properties.get('max')) ?? 10,
    step: asNumber(properties.get('step')) ?? 1,
    label: asString(properties.get('label')),
    unit: asString(properties.get('unit')),
    thresholds: numberList(properties.get('thresholds')),
  };
}
