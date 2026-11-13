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
  // The Sketches of the document by name, wherever they stand.
  sketches: BlockDefinitions;
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
    sketches: collectSketches(sflDocument.blocks),
    shaders: collectShaderDefinitions(sflDocument),
    model: findCanvasModel(sflDocument),
  };
}

function collectSketches(blocks: readonly SflBlock[], found: BlockDefinitions = new Map()): BlockDefinitions {
  for (const block of blocks) {
    if (block.kind === 'Sketch') {
      found.set(block.name, block);
    } else {
      collectSketches(childBlocks(block), found);
    }
  }
  return found;
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
  const blocks = new Map(sflDocument.blocks.filter(block => block.kind === 'Symbol').map(block => [block.name, block]));
  const reading = new Set<string>();
  // A symbol that takes another one into it reads that one first. One that leads back to itself is read without it.
  const read = (name: string): ReturnType<typeof readSymbolDefinition> => {
    const known = symbols.get(name);
    const block = blocks.get(name);
    if (known || !block || reading.has(name)) {
      return known;
    }
    reading.add(name);
    const symbol = readSymbolDefinition(block, read);
    reading.delete(name);
    if (symbol) {
      symbols.set(name, symbol);
    }
    return symbol;
  };
  for (const name of blocks.keys()) {
    read(name);
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
