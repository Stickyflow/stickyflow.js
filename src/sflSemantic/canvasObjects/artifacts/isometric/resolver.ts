import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import { readIsometric } from './reader';
import type { SflIsometricObject } from './types';

export function resolveIsometricObject(
  base: SflCanvasObjectBase,
  properties: Map<string, SflValue>,
): SflIsometricObject {
  return {
    ...base,
    objectType: 'isometric',
    isometric: readIsometric(properties),
  };
}
