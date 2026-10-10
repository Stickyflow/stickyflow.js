import { insertBlockLines } from '../blockInsert';
import { nameExists, VALID_IDENT } from '../scanner';
import { buildCanvasObjectBlock } from './blockText';
import { resolveCanvasObjectInsertionTarget } from './insertionTarget';
import { buildPathBlock } from './pathBlockText';
import type { InsertCanvasObjectOptions, InsertPathOptions } from './types';

export function insertCanvasObject(sfl: string, options: InsertCanvasObjectOptions): string {
  if (!VALID_IDENT.test(options.id)) {
    return sfl;
  }

  const lines = sfl.split('\n');
  if (nameExists(lines, options.id)) {
    return sfl;
  }

  const target = resolveCanvasObjectInsertionTarget(sfl, lines, options.parentId);
  if (!target) {
    return sfl;
  }

  insertBlockLines(lines, target.range, baseIndent => buildCanvasObjectBlock(options, target.origin, baseIndent));
  return lines.join('\n');
}

export function insertPath(sfl: string, options: InsertPathOptions): string {
  if (!VALID_IDENT.test(options.id) || options.points.length < 2) {
    return sfl;
  }

  const lines = sfl.split('\n');
  if (nameExists(lines, options.id)) {
    return sfl;
  }

  const target = resolveCanvasObjectInsertionTarget(sfl, lines, options.parentId);
  if (!target) {
    return sfl;
  }

  insertBlockLines(lines, target.range, baseIndent => buildPathBlock(options, target.origin, baseIndent));
  return lines.join('\n');
}
