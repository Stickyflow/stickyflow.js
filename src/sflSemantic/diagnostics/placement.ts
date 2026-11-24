import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

// Blocks of a chart, where `at`, `size` and `scale` say something else than a place: the line of a rule, the size of a marker,
// the scale of an axis.
const CHART = new Set(['Chart', 'Series', 'Axis', 'Rule', 'Band', 'Legend', 'Mark']);
// Blocks placed in a Scene, which are sized and scaled by their layout.
const PLACED = new Set(['Solid', 'Mesh', 'Facets', 'Terrain', 'Canvas', 'Group', 'Use', 'Repeat']);
const KEYS = ['at', 'position', 'rotation', 'scale', 'size'];

// The shapes of a Sketch, the ports of a Symbol and what is laid into a Symbol read their place on themselves before, and still do.
const inShape = (block: SflBlock, parent: SflBlock | undefined) =>
  block.kind === 'Rect' || block.kind === 'Circle' || block.kind === 'Port' || parent?.kind === 'Symbol';

function readBefore(key: string, block: SflBlock, parent: SflBlock | undefined): boolean {
  if (key === 'position') {
    return block.kind === 'Light';
  }
  if (key === 'at') {
    return inShape(block, parent);
  }
  return key === 'size' && inShape(block, parent) && block.kind !== 'Circle' && block.kind !== 'Port';
}

// Whether a key on the block itself means a place, or something else a block of this kind reads by that name.
function meansPlace(key: string, block: SflBlock, parent: SflBlock | undefined): boolean {
  if (key === 'position' || key === 'rotation') {
    return true;
  }
  return readBefore(key, block, parent) || (key !== 'at' && PLACED.has(block.kind));
}

// Where a block is placed, and how large it is, is written in its layout. A place written on the block itself was read there before
// for a few blocks, and still is, with a word on how it is written now; anywhere else it did nothing, and that is said.
export function collectPlacementsOutsideLayout(doc: SflDocument): SflDiagnostic[] {
  const found: SflDiagnostic[] = [];
  const visit = (block: SflBlock, parent: SflBlock | undefined) => {
    const own = directProperties(block);
    for (const key of CHART.has(block.kind) ? [] : KEYS.filter(written => own.has(written))) {
      if (!meansPlace(key, block, parent)) {
        continue;
      }
      const now = key === 'at' ? 'position' : key;
      found.push({
        severity: 'warning',
        code: 'placement-outside-layout',
        ownerId: block.name,
        message: readBefore(key, block, parent)
          ? `${block.kind} '${block.name}' writes ${key} on itself. It is read, but is written in its layout now: layout { ${now}: … }.`
          : `${block.kind} '${block.name}' writes ${key} on itself, where it does nothing. Write it in its layout: layout { ${now}: … }.`,
      });
    }
    for (const child of childBlocks(block)) {
      visit(child, block);
    }
  };
  for (const block of doc.blocks) {
    visit(block, undefined);
  }
  return found;
}
