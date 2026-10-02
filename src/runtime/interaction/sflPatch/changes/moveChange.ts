import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { MoveChangeEvent } from '../../events';
import { replacePropertyValue } from '../edits/propertyValues';
import { round1 } from '../format';
import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock, type LineRange } from '../scanner';
import { pointsSpan, readSpan } from './pathPoints';

const POINT_PAIR = /\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g;

function movePathPoints(lines: string[], range: LineRange, dx: number, dy: number): void {
  const span = pointsSpan(lines, range);
  if (span === null) {
    return;
  }
  const shifted = readSpan(lines, span).replace(
    POINT_PAIR,
    (_match, x: string, y: string) => `[${round1(Number(x) + dx)}, ${round1(Number(y) + dy)}]`,
  );
  replacePropertyValue(lines, span, shifted);
}

export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  const state = sflToCanvasState(sfl);
  const entity = state.canvasObjects.find(candidate => candidate.id === event.owner.id);
  if (!entity) {
    return sfl;
  }
  // `entity.x`/`entity.y` are absolute canvas coordinates (the parent chain's
  // origin already folded in â€” see sflSemantic/canvasObjects/processing/layout/geometry.ts), but `layout.position`
  // is an offset from the immediate parent's own origin, not an absolute
  // coordinate. Writing the absolute value straight back for a child nested
  // in a container that itself sits away from (0, 0) double-counts that
  // container's own offset on the next render. Subtracting the parent's
  // absolute origin converts back to the coordinate space `position` is
  // actually in; a top-level entity has no parent, so this is a no-op there.
  const parent = entity.parentFrameId
    ? state.canvasObjects.find(candidate => candidate.id === entity.parentFrameId)
    : undefined;
  const originX = parent?.x ?? 0;
  const originY = parent?.y ?? 0;
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  if (event.owner.role === 'path') {
    movePathPoints(lines, range, event.dx, event.dy);
    return lines.join('\n');
  }
  setOrInsertLayoutTuples(lines, range, [['position', entity.x - originX + event.dx, entity.y - originY + event.dy]]);
  return lines.join('\n');
}
