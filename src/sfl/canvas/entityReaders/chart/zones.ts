import type { SflValue } from '../../../ast';
import { asString } from '../../readers';
import type { ChartData } from './types';

export function readChartZones(value?: SflValue): ChartData['zones'] {
  if (value?.type !== 'list') {
    return undefined;
  }
  const zones = value.values.flatMap(item => {
    if (item.type !== 'list') {
      return [];
    }
    const label = asString(item.values[0]);
    return label === undefined ? [] : [{ label, color: asString(item.values[1]) }];
  });
  return zones.length > 0 ? zones : undefined;
}
