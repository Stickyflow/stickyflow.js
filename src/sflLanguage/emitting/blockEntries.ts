import type { SflBinding, SflBlock, SflLayout, SflProperty, SflStyle } from '../ast';

export interface BlockEntries {
  properties: SflProperty[];
  blocks: SflBlock[];
  layouts: SflLayout[];
  styles: SflStyle[];
  dataBlocks: SflBlock[];
  fields: SflProperty[][];
  samples: SflProperty[][];
  bindings: SflBinding[];
}

export function collectBlockEntries(block: SflBlock): BlockEntries {
  const entries: BlockEntries = { properties: [], blocks: [], layouts: [], styles: [], dataBlocks: [], fields: [], samples: [], bindings: [] };

  for (const entry of block.entries) {
    if (entry.type === 'property') {
      entries.properties.push(entry.property);
    } else if (entry.type === 'block') {
      entries.blocks.push(entry.block);
    } else if (entry.type === 'layout') {
      entries.layouts.push(entry.layout);
    } else if (entry.type === 'style') {
      entries.styles.push(entry.style);
    } else if (entry.type === 'fields') {
      entries.fields.push(entry.fields);
    } else if (entry.type === 'sample') {
      entries.samples.push(entry.sample);
    } else if (entry.type === 'binding') {
      entries.bindings.push(entry.binding);
    } else {
      entries.dataBlocks.push(entry.data);
    }
  }

  return entries;
}
