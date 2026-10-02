import type { SflBlock } from '../../ast';
import { childBlocks, directProperties } from '../blockEntries';
import { isCanvasObjectBlockKind } from '../canvasObjects/blockKinds';
import { asString } from '../valueAccess';

export function directGroupMemberIds(block: SflBlock): string[] {
  return childBlocks(block)
    .filter(child => isCanvasObjectBlockKind(child.kind))
    .map(child => asString(directProperties(child).get('id')) ?? child.name);
}
