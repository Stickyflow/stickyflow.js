import { indentOf } from '../format';
import { buildLinkBlock } from './blockText';
import { resolveLinkInsertionTarget } from './insertionTarget';
import type { InsertLinkOptions } from './types';

export function insertLink(sfl: string, options: InsertLinkOptions): string {
  const lines = sfl.split('\n');
  const modelRange = resolveLinkInsertionTarget(sfl, lines, options);
  if (!modelRange) {
    return sfl;
  }

  const baseIndent = `${indentOf(lines[modelRange.start])}    `;
  const block = buildLinkBlock(options, baseIndent);
  lines.splice(modelRange.end, 0, ...block);
  return lines.join('\n');
}
