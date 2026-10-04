import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import { readPath } from './reader';
import type { SflPathObject } from './types';

export function resolvePathObject(
  base: SflCanvasObjectBase,
  properties: Map<string, SflValue>,
  origin: { x: number; y: number },
): SflPathObject {
  return {
    ...base,
    objectType: 'path',
    path: readPath(properties, origin),
  };
}
