import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import type { SflDimensionObject } from './object';
import { readDimension } from './reader';

export function resolveDimensionObject(
  base: SflCanvasObjectBase,
  properties: Map<string, SflValue>,
  origin: { x: number; y: number },
): SflDimensionObject {
  return {
    ...base,
    objectType: 'dimension',
    dimension: readDimension(properties, origin),
  };
}
