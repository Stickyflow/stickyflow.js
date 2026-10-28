import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

const OBJECTS = new Set([
  'Shape',
  'Text',
  'Container',
  'Chart',
  'Path',
  'Widget',
  'Component',
  'Entity',
  'Isometric',
  'Group',
]);
const LINKS = new Set(['Link', 'Connection']);

// A block is found by its name, so two objects with one name are a mistake, whatever wrote them, a person or a Repeat with two templates of one name.
export function collectDuplicateNames(sflDocument: SflDocument): SflDiagnostic[] {
  const counts = new Map<string, number>();
  const visit = (block: SflBlock): void => {
    const space = OBJECTS.has(block.kind) ? 'object' : LINKS.has(block.kind) ? 'link' : undefined;
    if (space) {
      const key = `${space}:${block.name}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };
  for (const block of sflDocument.blocks) {
    visit(block);
  }
  const diagnostics: SflDiagnostic[] = [];
  for (const [key, count] of counts) {
    if (count > 1) {
      const name = key.slice(key.indexOf(':') + 1);
      diagnostics.push({
        severity: 'warning',
        code: 'duplicate-name',
        ownerId: name,
        message: `The name '${name}' is used ${count} times. A name must be unique in a document, so give each block its own.`,
      });
    }
  }
  return diagnostics;
}
