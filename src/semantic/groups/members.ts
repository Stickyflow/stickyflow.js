import type { SflBlock } from '../../sfl/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import { asString } from '../ast/valueAccess';
import { isCanvasObjectBlockKind } from '../canvasObjects/processing/blockKinds';

export function directGroupMemberIds(block: SflBlock): string[] {
  return childBlocks(block)
    .filter(child => isCanvasObjectBlockKind(child.kind))
    .map(child => asString(directProperties(child).get('id')) ?? child.name);
}
