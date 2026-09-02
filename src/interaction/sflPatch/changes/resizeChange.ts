import type { ResizeChangeEvent } from '../../events';
import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock } from '../scanner';

export function applyResizeChange(sfl: string, event: ResizeChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  setOrInsertLayoutTuples(lines, range, [
    ['position', event.x, event.y],
    ['size', event.width, event.height],
  ]);
  return lines.join('\n');
}
