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
  const canvasObject = state.canvasObjects.find(candidate => candidate.id === event.owner.id);
  if (!canvasObject) {
    return sfl;
  }
  const parent = canvasObject.parentFrameId
    ? state.canvasObjects.find(candidate => candidate.id === canvasObject.parentFrameId)
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
  setOrInsertLayoutTuples(lines, range, [
    ['position', canvasObject.x - originX + event.dx, canvasObject.y - originY + event.dy],
  ]);
  return lines.join('\n');
}
