import type { SflBlock, SflLayout, SflProperty, SflStyle } from '../ast';

export interface BlockEntries {
  properties: SflProperty[];
  blocks: SflBlock[];
  layout?: SflLayout;
  style?: SflStyle;
  data?: SflBlock;
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
    } else if (entry.type === 'style') {
      entries.style = entry.style;
    } else {
      entries.data = entry.data;
    }
  }

  return entries;
}
