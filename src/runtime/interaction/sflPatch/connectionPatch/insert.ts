import { insertBlockLines } from '../blockInsert';
import { buildConnectionBlock } from './blockText';
import { resolveConnectionInsertionTarget } from './insertionTarget';
import type { InsertConnectionOptions } from './types';

export function insertConnection(sfl: string, options: InsertConnectionOptions): string {
  const lines = sfl.split('\n');
  const modelRange = resolveConnectionInsertionTarget(sfl, lines, options);
  if (!modelRange) {
    return sfl;
  }

  insertBlockLines(lines, modelRange, baseIndent => buildConnectionBlock(options, baseIndent));
  return lines.join('\n');
}
