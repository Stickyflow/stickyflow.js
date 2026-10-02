import { findOwnerBlock, type LineRange } from '../scanner';
import { findReferencingLinkRanges } from './linkReferences';
import { outermostRemovalRanges } from './removalRanges';
import type { RemoveEntityOptions } from './types';

export function removeEntity(sfl: string, id: string, options: RemoveEntityOptions = {}): string {
  const lines = sfl.split('\n');
  const entityRange = findOwnerBlock(lines, id);
  if (!entityRange) {
    return sfl;
  }

  const ranges: LineRange[] = [entityRange];
  if (options.alsoRemoveLinks ?? true) {
    ranges.push(...findReferencingLinkRanges(lines, id));
  }

  const removalRanges = outermostRemovalRanges(ranges).sort((left, right) => right.start - left.start);
  for (const range of removalRanges) {
    lines.splice(range.start, range.end - range.start + 1);
  }

  return lines.join('\n');
}
