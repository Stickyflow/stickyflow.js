import type { SflBlock } from '../ast';
import { childBlocks, directProperties } from './blockEntries';
import { asString } from './valueAccess';

const ENTITY_KINDS = new Set(['Entity', 'Container', 'Table', 'Path', 'Chart']);

export function directGroupMemberIds(block: SflBlock): string[] {
  return childBlocks(block)
    .filter(child => ENTITY_KINDS.has(child.kind))
    .map(child => asString(directProperties(child).get('id')) ?? child.name);
}
