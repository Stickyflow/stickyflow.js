import type { SflBlock, SflDocument } from '../ast';
import { expandRepeatBlocks, hasRepeats } from './repeat';
import { expandUses, hasTemplates } from './template';

// A computed value is worked out for a cell of a Repeat or for a Use, so one that is left over has no cell to be worked out for.
function checkNoComputed(blocks: SflBlock[]): void {
  for (const block of blocks) {
    for (const entry of block.entries) {
      const properties =
        entry.type === 'property'
          ? [entry.property]
          : entry.type === 'layout'
            ? entry.layout.properties
            : entry.type === 'style'
              ? entry.style.properties
              : [];
      for (const property of properties) {
        if (property.value.type === 'expr') {
          throw new Error(
            `${block.kind} ${block.name}: ${property.key} is computed, and only a Repeat can work out a computed value`,
          );
        }
      }
      if (entry.type === 'block') {
        checkNoComputed([entry.block]);
      }
    }
  }
}

// A document in which every Repeat and every Use is replaced by the blocks it makes, and the Templates are taken out. A document without
// any of them is returned as it is.
export function expandDocument(doc: SflDocument): SflDocument {
  const repeats = hasRepeats(doc.blocks);
  if (!repeats && !hasTemplates(doc.blocks)) {
    checkNoComputed(doc.blocks);
    return doc;
  }
  const expanded = { ...doc, blocks: expandUses(repeats ? expandRepeatBlocks(doc.blocks) : doc.blocks) };
  checkNoComputed(expanded.blocks);
  return expanded;
}
