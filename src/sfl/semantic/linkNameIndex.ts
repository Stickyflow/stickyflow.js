import type { SflBlock } from '../ast';
import { childBlocks, directProperties } from './blockEntries';
import { asString } from './valueAccess';

const LINKABLE_BLOCK_KINDS = new Set(['Shape', 'Container', 'Table', 'Path', 'Chart']);

function indexLinkableNames(blocks: SflBlock[], idByName: Map<string, string>): void {
  for (const block of blocks) {
    if (LINKABLE_BLOCK_KINDS.has(block.kind)) {
      idByName.set(block.name, asString(directProperties(block).get('id')) ?? block.name);
    }

    indexLinkableNames(childBlocks(block), idByName);
  }
}

export function buildLinkNameIndex(model: SflBlock | undefined): Map<string, string> {
  const idByName = new Map<string, string>();
  if (model) {
    indexLinkableNames(childBlocks(model), idByName);
  }
  return idByName;
}
