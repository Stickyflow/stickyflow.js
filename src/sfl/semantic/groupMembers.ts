import type { SflBlock } from '../ast';
import { childBlocks, directProperties } from './blockEntries';
import { isCanvasEntityBlockKind } from './canvasEntityBlocks';
import { asString } from './valueAccess';

export function directGroupMemberIds(block: SflBlock): string[] {
  return childBlocks(block)
    .filter(child => isCanvasEntityBlockKind(child.kind))
    .map(child => asString(directProperties(child).get('id')) ?? child.name);
}
