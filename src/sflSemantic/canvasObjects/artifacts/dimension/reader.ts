import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString, tupleValues } from '../../../ast/valueAccess';
import type { SflDimensionData } from './types';

type Properties = Map<string, SflValue>;

function readPoint(value: SflValue | undefined, origin: { x: number; y: number }): { x: number; y: number } {
  const [x, y] = tupleValues(value) ?? [];
  return { x: origin.x + (x ?? 0), y: origin.y + (y ?? 0) };
}

export function readDimension(properties: Properties, origin: { x: number; y: number }): SflDimensionData {
  return {
    start: readPoint(properties.get('start'), origin),
    end: readPoint(properties.get('end'), origin),
    offset: asNumber(properties.get('offset')) ?? 0,
    unit: asString(properties.get('unit')),
  };
}
