import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties, styleProperties } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

function blocksIn(block: SflBlock): SflBlock[] {
  return [block, ...childBlocks(block).flatMap(blocksIn)];
}

// A property may stand on a block or in its style. Written in both, the one in the style counts and the other says nothing.
export function collectPropertiesWrittenTwice(sflDocument: SflDocument): SflDiagnostic[] {
  return sflDocument.blocks.flatMap(blocksIn).flatMap(block => {
    const own = directProperties(block);
    return [...styleProperties(block).keys()]
      .filter(key => own.has(key))
      .map(
        (key): SflDiagnostic => ({
          severity: 'warning',
          code: 'property-twice',
          ownerId: block.name,
          message: `'${key}' of ${block.kind} '${block.name}' stands on the block and in its style. The one in the style counts.`,
        }),
      );
  });
}
