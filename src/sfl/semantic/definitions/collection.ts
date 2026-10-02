import type { SflBlock, SflDocument } from '../../ast';
import { childBlocks } from '../ast/blockEntries';
import type { CanvasObjectResolutionContext } from '../canvasObjects/processing/resolver';
import { readSymbolDefinition } from './symbols';

export type BlockDefinitions = Map<string, SflBlock>;

export interface CanvasDefinitions {
  styles: BlockDefinitions;
  layouts: BlockDefinitions;
  symbols: CanvasObjectResolutionContext['symbolDefs'];
  model?: SflBlock;
}

function projectModel(block: SflBlock): SflBlock | undefined {
  return childBlocks(block).find(child => child.kind === 'Model');
}

export function collectCanvasDefinitions(sflDocument: SflDocument): CanvasDefinitions {
  return {
    styles: collectStyleDefinitions(sflDocument),
    layouts: collectLayoutDefinitions(sflDocument),
    symbols: collectSymbolDefinitions(sflDocument),
    model: findCanvasModel(sflDocument),
  };
}

function collectStyleDefinitions(sflDocument: SflDocument): BlockDefinitions {
  const styles: BlockDefinitions = new Map();
  for (const block of sflDocument.blocks) {
    if (block.kind === 'Style') {
      styles.set(block.name, block);
    }
  }
  return styles;
}

function collectLayoutDefinitions(sflDocument: SflDocument): BlockDefinitions {
  const layouts: BlockDefinitions = new Map();
  for (const block of sflDocument.blocks) {
    if (block.kind === 'Layout') {
      layouts.set(block.name, block);
    }
  }
  return layouts;
}

function collectSymbolDefinitions(sflDocument: SflDocument): CanvasObjectResolutionContext['symbolDefs'] {
  const symbols: CanvasObjectResolutionContext['symbolDefs'] = new Map();
  for (const block of sflDocument.blocks) {
    if (block.kind !== 'Symbol') {
      continue;
    }
    const symbol = readSymbolDefinition(block);
    if (symbol) {
      symbols.set(block.name, symbol);
    }
  }
  return symbols;
}

function findCanvasModel(sflDocument: SflDocument): SflBlock | undefined {
  for (const block of sflDocument.blocks) {
    if (block.kind === 'Model') {
      return block;
    }
    if (block.kind === 'Project') {
      const model = projectModel(block);
      if (model) {
        return model;
      }
    }
  }
  return undefined;
}
