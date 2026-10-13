import { insertBlockLines } from '../blockInsert';
import { buildLinkBlock } from './blockText';
import { resolveLinkInsertionTarget } from './insertionTarget';
import type { InsertLinkOptions } from './types';

export function insertLink(sfl: string, options: InsertLinkOptions): string {
  const lines = sfl.split('\n');
  const modelRange = resolveLinkInsertionTarget(sfl, lines, options);
  if (!modelRange) {
    return sfl;
  }

  insertBlockLines(lines, modelRange, baseIndent => buildLinkBlock(options, baseIndent));
  return lines.join('\n');
}
