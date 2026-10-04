import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import { findFirstBlockOfKind, type LineRange, nameExists, VALID_IDENT } from '../scanner';
import type { InsertConnectionOptions } from './types';

export function resolveConnectionInsertionTarget(
  sfl: string,
  lines: string[],
  options: InsertConnectionOptions,
): LineRange | null {
  if (!VALID_IDENT.test(options.id) || nameExists(lines, options.id)) {
    return null;
  }

  const canvasObjects = sflToCanvasState(sfl).canvasObjects;
  const hasSource = canvasObjects.some(canvasObject => canvasObject.id === options.fromId);
  const hasTarget = canvasObjects.some(canvasObject => canvasObject.id === options.toId);
  if (!hasSource || !hasTarget) {
    return null;
  }

  return findFirstBlockOfKind(lines, 'Model');
}
