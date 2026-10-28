import { findOwnerBlock, type LineRange } from '../scanner';
import { findReferencingLinkRanges } from './linkReferences';
import { excludeRepeatCell, findUseBlock } from './madeBlocks';
import { outermostRemovalRanges } from './removalRanges';
import type { RemoveCanvasObjectOptions } from './types';

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

  const ranges: LineRange[] = [canvasObjectRange];
  if (options.alsoRemoveLinks ?? true) {
    ranges.push(...findReferencingLinkRanges(lines, id));
  }

  const removalRanges = outermostRemovalRanges(ranges).sort((left, right) => right.start - left.start);
  for (const range of removalRanges) {
    lines.splice(range.start, range.end - range.start + 1);
  }

  return lines.join('\n');
}
