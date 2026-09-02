import { sflToCanvasState } from '../../../sfl';
import { findFirstBlockOfKind, findOwnerBlock, type LineRange } from '../scanner';

export interface EntityInsertionTarget {
  range: LineRange;
  origin: { x: number; y: number };
}

export function resolveEntityInsertionTarget(
  sfl: string,
  lines: string[],
  parentId: string | undefined,
): EntityInsertionTarget | null {
  if (!parentId) {
    const modelRange = findFirstBlockOfKind(lines, 'Model');
    return modelRange ? { range: modelRange, origin: { x: 0, y: 0 } } : null;
  }

  const parent = sflToCanvasState(sfl).entities.find(entity => entity.id === parentId);
  if (!parent) {
    return null;
  }

  const parentRange = findOwnerBlock(lines, parentId);
  if (!parentRange) {
    return null;
  }

  return { range: parentRange, origin: { x: parent.x, y: parent.y } };
}
