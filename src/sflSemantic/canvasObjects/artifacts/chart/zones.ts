import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
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
    if (label === undefined) {
      return [];
    }
    return [
      {
        label,
        color: asString(item.values[1]),
        offsetX: asNumber(item.values[2]),
        offsetY: asNumber(item.values[3]),
      },
    ];
  });
  return zones.length > 0 ? zones : undefined;
}
