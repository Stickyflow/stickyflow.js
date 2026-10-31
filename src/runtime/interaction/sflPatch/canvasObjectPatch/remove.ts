import { braceDelta, maskLines } from '../scan/sourceMask';
import { blockEndLine, findOwnerBlock, type LineRange } from '../scanner';
import { findReferencingLinkRanges } from './linkReferences';
import { excludeRepeatCell, findUseBlock } from './madeBlocks';
import { outermostRemovalRanges } from './removalRanges';
import type { RemoveCanvasObjectOptions } from './types';

const GROUP_HEADER = /^\s*Group\s+([A-Za-z_][A-Za-z0-9_]*)\b/;
const CHILD_BLOCK = /^\s*[A-Z][A-Za-z]*\s+[A-Za-z_]/;

// The names of the groups around a line, the innermost first.
function enclosingGroups(lines: string[], line: number): string[] {
  const masked = maskLines(lines);
  if (masked === null) {
    return [];
  }
  const open: Array<string | null> = [];
  for (let i = 0; i < line; i++) {
    const delta = braceDelta(masked[i]);
    if (delta > 0) {
      const group = masked[i].match(GROUP_HEADER);
      open.push(group ? group[1] : null);
      for (let extra = 1; extra < delta; extra++) {
        open.push(null);
      }
    } else {
      open.splice(open.length + delta, -delta);
    }
  }
  return open.filter((name): name is string => name !== null).reverse();
}

// A group that held the removed object and now holds no object goes with it, and so on outward.
function removeEmptiedGroups(lines: string[], groups: string[]): void {
  for (const name of groups) {
    const masked = maskLines(lines);
    const start = masked?.findIndex(line => line.match(GROUP_HEADER)?.[1] === name) ?? -1;
    if (!masked || start < 0) {
      return;
    }
    const end = blockEndLine(lines, start);
    if (masked.slice(start + 1, end).some(line => CHILD_BLOCK.test(line))) {
      return;
    }
    lines.splice(start, end - start + 1);
  }
}

export function removeCanvasObject(sfl: string, id: string, options: RemoveCanvasObjectOptions = {}): string {
  const lines = sfl.split('\n');
  const canvasObjectRange = findOwnerBlock(lines, id);
  if (!canvasObjectRange) {
    const cell = excludeRepeatCell(lines, id);
    if (cell) {
      return cell.join('\n');
    }
    const use = findUseBlock(lines, id);
    if (use) {
      lines.splice(use.start, use.end - use.start + 1);
      return lines.join('\n');
    }
    return sfl;
  }

  const groups = enclosingGroups(lines, canvasObjectRange.start);
  const ranges: LineRange[] = [canvasObjectRange];
  if (options.alsoRemoveLinks ?? true) {
    ranges.push(...findReferencingLinkRanges(lines, id));
  }

  const removalRanges = outermostRemovalRanges(ranges).sort((left, right) => right.start - left.start);
  for (const range of removalRanges) {
    lines.splice(range.start, range.end - range.start + 1);
  }

  removeEmptiedGroups(lines, groups);

  return lines.join('\n');
}
