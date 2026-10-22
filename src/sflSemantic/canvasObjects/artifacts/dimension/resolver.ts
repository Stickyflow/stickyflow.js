import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import { readDimension } from './reader';
import type { SflDimensionObject } from './types';

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
