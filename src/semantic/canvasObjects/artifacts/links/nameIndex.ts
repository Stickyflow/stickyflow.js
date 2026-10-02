import type { SflBlock } from '../../../../sfl/ast';
import { childBlocks, directProperties } from '../../../ast/blockEntries';
import { asString } from '../../../ast/valueAccess';
import { isCanvasObjectBlockKind } from '../../processing/blockKinds';

function indexLinkableNames(blocks: SflBlock[], idByName: Map<string, string>): void {
  for (const block of blocks) {
    if (isCanvasObjectBlockKind(block.kind)) {
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
