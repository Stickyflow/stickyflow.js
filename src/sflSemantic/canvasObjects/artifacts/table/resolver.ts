import type { SflBlock, SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObjectBase } from '../../types';
import { readTable } from './reader';
import type { SflTableObject } from './types';

type LayoutProperty = (block: SflBlock, key: string) => SflValue | undefined;

export function resolveTableObject(
  base: SflCanvasObjectBase,
  block: SflBlock,
  properties: Map<string, SflValue>,
  layoutProperty: LayoutProperty,
): SflTableObject {
  return {
    ...base,
    objectType: 'table',
    table: readTable(block, properties, layoutProperty, base.props),
  };
}
