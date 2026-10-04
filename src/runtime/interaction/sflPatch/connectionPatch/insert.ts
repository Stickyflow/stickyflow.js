import { indentOf } from '../format';
import { buildConnectionBlock } from './blockText';
import { resolveConnectionInsertionTarget } from './insertionTarget';
import type { InsertConnectionOptions } from './types';

export function insertConnection(sfl: string, options: InsertConnectionOptions): string {
  const lines = sfl.split('\n');
  const modelRange = resolveConnectionInsertionTarget(sfl, lines, options);
  if (!modelRange) {
    return sfl;
  }

  const baseIndent = `${indentOf(lines[modelRange.start])}    `;
  const block = buildConnectionBlock(options, baseIndent);
  lines.splice(modelRange.end, 0, ...block);
  return lines.join('\n');
}
