import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties, styleProperties } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

function blocksIn(block: SflBlock): SflBlock[] {
  return [block, ...childBlocks(block).flatMap(blocksIn)];
}

// A property may stand on a block or in its style. Written in both, the one in the style counts and the other says nothing.
export function collectPropertiesWrittenTwice(sflDocument: SflDocument): SflDiagnostic[] {
  return sflDocument.blocks.flatMap(blocksIn).flatMap(block => {
    const own = directProperties(block);
    return [...styleProperties(block).keys()]
      .filter(key => own.has(key))
      .map(
        (key): SflDiagnostic => ({
          severity: 'warning',
          code: 'property-twice',
          ownerId: block.name,
          message: `'${key}' of ${block.kind} '${block.name}' stands on the block and in its style. The one in the style counts.`,
        }),
      );
  });
}

// What a block is and what it is made of stands on the block; its style says how it looks. These words say what a block is.
const FORM = new Set([
  'asset',
  'symbol',
  'sketch',
  'loft',
  'height',
  'chamfer',
  'fillet',
  'chamferEdges',
  'filletEdges',
  'chamferTop',
  'chamferBottom',
  'filletTop',
  'filletBottom',
  'mirror',
  'taper',
  'shift',
  'points',
  'faces',
  'thickness',
  'bevel',
  'symmetry',
  'heights',
  'picture',
  'anchor',
  'position',
  'rotation',
  'scale',
  'size',
  'at',
]);

// The blocks of a Scene, where these words make the form. A Component or a chart uses some of them for how it looks.
const BODIES = new Set([
  'Solid',
  'Mesh',
  'Facets',
  'Terrain',
  'Cut',
  'Add',
  'Keep',
  'Light',
  'Ground',
  'Canvas',
  'Group',
  'Use',
]);

// A word of the form written in a style is still read, as a style and the block are read together, and said.
export function collectFormInStyle(sflDocument: SflDocument): SflDiagnostic[] {
  return sflDocument.blocks.flatMap(blocksIn).flatMap(block =>
    [...(BODIES.has(block.kind) ? styleProperties(block).keys() : [])]
      .filter(key => FORM.has(key))
      .map(
        (key): SflDiagnostic => ({
          severity: 'warning',
          code: 'form-in-style',
          ownerId: block.name,
          message: `'${key}' of ${block.kind} '${block.name}' stands in its style, which says how it looks. It says what it is: write it on the block${['position', 'rotation', 'scale', 'size', 'at'].includes(key) ? ', in its layout' : ''}. It is still read.`,
        }),
      ),
  );
}
