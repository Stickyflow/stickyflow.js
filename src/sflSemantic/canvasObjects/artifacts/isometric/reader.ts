import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { SflSymbolDefinition } from '../../types';
import type { SflIsometricData } from './types';

type Properties = Map<string, SflValue>;

function readFootprintPoint(value: SflValue): Array<[number, number]> {
  if (value.type !== 'list' || value.values.length < 2) {
    return [];
  }
  const x = asNumber(value.values[0]);
  const y = asNumber(value.values[1]);
  return x === undefined || y === undefined ? [] : [[x, y]];
}

function readFootprint(
  value: SflValue | undefined,
  symbolDefs: Map<string, SflSymbolDefinition>,
): Array<[number, number]> | undefined {
  if (value?.type === 'list') {
    const points = value.values.flatMap(readFootprintPoint);
    return points.length >= 3 ? points : undefined;
  }
  const name = asString(value);
  const definition = name ? symbolDefs.get(name) : undefined;
  return definition && definition.points.length >= 3 ? definition.points : undefined;
}

export function readIsometric(
  properties: Properties,
  depth: number,
  symbolDefs: Map<string, SflSymbolDefinition>,
): SflIsometricData {
  return {
    depth,
    icon: asString(properties.get('icon')),
    footprint: readFootprint(properties.get('symbol'), symbolDefs),
    form: asString(properties.get('shape')) === 'sphere' ? 'sphere' : 'box',
  };
}
