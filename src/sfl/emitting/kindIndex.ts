import type { BlockKind, SflBlock, SflDocument } from '../ast';

export function buildKindIndex(sflDocument: SflDocument): Map<string, BlockKind> {
  const kinds = new Map<string, BlockKind>();

  function indexBlocks(blocks: SflBlock[]): void {
    for (const block of blocks) {
      if (!kinds.has(block.name)) {
        kinds.set(block.name, block.kind);
      }

      const nestedBlocks = block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []));
      indexBlocks(nestedBlocks);
    }
  }

  indexBlocks(sflDocument.blocks);
  return kinds;
}
