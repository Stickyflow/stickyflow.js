import type { Shader } from '../../model/shader';
import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks } from '../ast/blockEntries';
import type { CanvasObjectResolutionContext } from '../canvasObjects/processing/resolver';
import { readShaderDefinition } from './shaders';
import { readSymbolDefinition } from './symbols';

export type BlockDefinitions = Map<string, SflBlock>;

export interface CanvasDefinitions {
  styles: BlockDefinitions;
  layouts: BlockDefinitions;
  symbols: CanvasObjectResolutionContext['symbolDefs'];
  shaders: Map<string, Shader>;
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
    shaders: collectShaderDefinitions(sflDocument),
    model: findCanvasModel(sflDocument),
  };
}

function collectShaderDefinitions(sflDocument: SflDocument): Map<string, Shader> {
  const shaders = new Map<string, Shader>();
  for (const block of sflDocument.blocks) {
    if (block.kind !== 'Shader') {
      continue;
    }
    const shader = readShaderDefinition(block);
    if (shader) {
      shaders.set(block.name, shader);
    }
  }
  return shaders;
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
