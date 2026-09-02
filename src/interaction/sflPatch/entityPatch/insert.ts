import { indentOf } from '../format';
import { nameExists, VALID_IDENT } from '../scanner';
import { buildEntityBlock } from './blockText';
import { resolveEntityInsertionTarget } from './insertionTarget';
import type { InsertEntityOptions } from './types';

export function insertEntity(sfl: string, options: InsertEntityOptions): string {
  if (!VALID_IDENT.test(options.id)) {
    return sfl;
  }

  const lines = sfl.split('\n');
  if (nameExists(lines, options.id)) {
    return sfl;
  }

  const target = resolveEntityInsertionTarget(sfl, lines, options.parentId);
  if (!target) {
    return sfl;
  }

  const baseIndent = `${indentOf(lines[target.range.start])}    `;
  const block = buildEntityBlock(options, target.origin, baseIndent);
  lines.splice(target.range.end, 0, ...block);
  return lines.join('\n');
}
