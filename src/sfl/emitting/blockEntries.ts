import type { SflBlock, SflLayout, SflProperty, SflStyle } from '../ast';

export interface BlockEntries {
  properties: SflProperty[];
  blocks: SflBlock[];
  layout?: SflLayout;
  style?: SflStyle;
}

export function collectBlockEntries(block: SflBlock): BlockEntries {
  const entries: BlockEntries = { properties: [], blocks: [] };

  for (const entry of block.entries) {
    if (entry.type === 'property') {
      entries.properties.push(entry.property);
    } else if (entry.type === 'block') {
      entries.blocks.push(entry.block);
    } else if (entry.type === 'layout') {
      entries.layout = entry.layout;
    } else {
      entries.style = entry.style;
    }
  }

  return entries;
}
