import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import { findFirstBlockOfKind, type LineRange, nameExists, VALID_IDENT } from '../scanner';
import type { InsertLinkOptions } from './types';

export function resolveLinkInsertionTarget(sfl: string, lines: string[], options: InsertLinkOptions): LineRange | null {
  if (!VALID_IDENT.test(options.id) || nameExists(lines, options.id)) {
    return null;
  }

  const entities = sflToCanvasState(sfl).canvasObjects;
  const hasSource = entities.some(entity => entity.id === options.fromId);
  const hasTarget = entities.some(entity => entity.id === options.toId);
  if (!hasSource || !hasTarget) {
    return null;
  }

  return findFirstBlockOfKind(lines, 'Model');
}
