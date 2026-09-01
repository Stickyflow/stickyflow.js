import type { SflBlock, SflDocument } from '../ast';
import { childBlocks } from './blockEntries';
import type { EntityReaderContext } from './entityReader';
import { readSymbolDefinition } from './symbols';

export type BlockDefinitions = Map<string, SflBlock>;

export interface CanvasDefinitions {
  styles: BlockDefinitions;
  layouts: BlockDefinitions;
  symbols: EntityReaderContext['symbolDefs'];
  model?: SflBlock;
}

function projectModel(block: SflBlock): SflBlock | undefined {
  return childBlocks(block).find(child => child.kind === 'Model');
}

export function collectCanvasDefinitions(sflDocument: SflDocument): CanvasDefinitions {
  const styles: BlockDefinitions = new Map();
  const layouts: BlockDefinitions = new Map();
  const symbols: EntityReaderContext['symbolDefs'] = new Map();
  let model: SflBlock | undefined;

  for (const block of sflDocument.blocks) {
    if (block.kind === 'Style') {
      styles.set(block.name, block);
      continue;
    }
    if (block.kind === 'Layout') {
      layouts.set(block.name, block);
      continue;
    }
    if (block.kind === 'Symbol') {
      const symbol = readSymbolDefinition(block);
      if (symbol) {
        symbols.set(block.name, symbol);
      }
      continue;
    }
    if (block.kind === 'Model' && !model) {
      model = block;
      continue;
    }
    if (block.kind === 'Project' && !model) {
      model = projectModel(block);
    }
  }

  return { styles, layouts, symbols, model };
}
