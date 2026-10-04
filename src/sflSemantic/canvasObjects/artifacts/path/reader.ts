import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { SflPathData } from './types';

type Properties = Map<string, SflValue>;

export function readPath(p: Properties, origin: { x: number; y: number }): SflPathData {
  const pointsValue = p.get('points');
  const points =
    pointsValue?.type === 'list'
      ? pointsValue.values.flatMap(value => {
          if (value.type !== 'list' || value.values.length < 2) {
            return [];
          }
          const x = asNumber(value.values[0]);
          const y = asNumber(value.values[1]);
          return x !== undefined && y !== undefined ? [{ x: origin.x + x, y: origin.y + y }] : [];
        })
      : [];

  return {
    points,
    tension: asNumber(p.get('tension')),
    startMarker: asString(p.get('startMarker')),
    endMarker: asString(p.get('endMarker')),
    closed: asString(p.get('closed')) === 'true',
    value: asNumber(p.get('value')),
  };
}
