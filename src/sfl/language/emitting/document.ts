import type { SflDocument } from '../ast';
import { joinSiblingBlocks } from './blocks';
import { buildKindIndex } from './kindIndex';

export function emitDocument(doc: SflDocument): string {
  const body = joinSiblingBlocks(doc.blocks, 0, buildKindIndex(doc));
  const output = body ? `sfl ${doc.version}\n\n${body}` : `sfl ${doc.version}`;
  const trimmed = output
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n');
  return `${trimmed}\n`;
}
