import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import { findFirstBlockOfKind, findOwnerBlock, type LineRange } from '../scanner';

export interface CanvasObjectInsertionTarget {
  range: LineRange;
  origin: { x: number; y: number };
}

export function resolveCanvasObjectInsertionTarget(
  sfl: string,
  lines: string[],
  parentId: string | undefined,
): CanvasObjectInsertionTarget | null {
  if (!parentId) {
    const modelRange = findFirstBlockOfKind(lines, 'Model');
    return modelRange ? { range: modelRange, origin: { x: 0, y: 0 } } : null;
  }

  const parent = sflToCanvasState(sfl).canvasObjects.find(canvasObject => canvasObject.id === parentId);
  if (!parent) {
    return null;
  }

  const parentRange = findOwnerBlock(lines, parentId);
  if (!parentRange) {
    return null;
  }

  return { range: parentRange, origin: { x: parent.x, y: parent.y } };
}
