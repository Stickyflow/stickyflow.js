import type { SflBinding, SflBlock, SflHandler, SflLayout, SflProperty, SflStyle } from '../ast';

export interface BlockEntries {
  properties: SflProperty[];
  blocks: SflBlock[];
  layouts: SflLayout[];
  styles: SflStyle[];
  dataBlocks: SflBlock[];
  fields: SflProperty[][];
  bindings: SflBinding[];
  handlers: SflHandler[];
}

export function collectBlockEntries(block: SflBlock): BlockEntries {
  const entries: BlockEntries = { properties: [], blocks: [], layouts: [], styles: [], dataBlocks: [], fields: [], bindings: [], handlers: [] };

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
    } else if (entry.type === 'binding') {
      entries.bindings.push(entry.binding);
    } else if (entry.type === 'handler') {
      entries.handlers.push(entry.handler);
    } else {
      entries.dataBlocks.push(entry.data);
    }
  }

  return entries;
}
