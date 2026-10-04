import type { SflBlock, SflValue } from '../../../../sflLanguage/ast';
import { tupleValues } from '../../../ast/valueAccess';
import type { SflCanvasObjectBase } from '../../types';
import { readIsometric } from './reader';
import type { SflIsometricObject } from './types';

export function resolveIsometricObject(
  base: SflCanvasObjectBase,
  block: SflBlock,
  properties: Map<string, SflValue>,
  layoutProperty: (block: SflBlock, key: string) => SflValue | undefined,
): SflIsometricObject {
  const size = tupleValues(layoutProperty(block, 'size'));
  return {
    ...base,
    objectType: 'isometric',
    isometric: readIsometric(properties, size?.[2] ?? 24),
  };
}
