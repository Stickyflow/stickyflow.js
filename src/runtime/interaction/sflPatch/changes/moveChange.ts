import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { MoveChangeEvent } from '../../events';
import { replacePropertyValue } from '../edits/propertyValues';
import { round1 } from '../format';
import { setOrInsertLayoutTuples } from '../properties';
import { findOwnerBlock, type LineRange } from '../scanner';
import { pointsSpan, readSpan } from './pathPoints';

const POINT_PAIR = /\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(,\s*-?[\d.]+\s*)?\]/g;

function movePathPoints(lines: string[], range: LineRange, dx: number, dy: number): void {
  const span = pointsSpan(lines, range);
  if (span === null) {
    return;
  }
  const shifted = readSpan(lines, span).replace(
    POINT_PAIR,
    (_match, x: string, y: string, rest?: string) =>
      `[${round1(Number(x) + dx)}, ${round1(Number(y) + dy)}${rest ? `, ${rest.replace(/^,\s*/, '').trim()}` : ''}]`,
  );
  replacePropertyValue(lines, span, shifted);
}

// Several objects of one drag at once: the document is read one time, however many there are.
// A position inside a frame is relative to it, so an object whose frame moves along is not moved a second time.
export function applyMoveChanges(sfl: string, events: readonly MoveChangeEvent[]): string {
  const state = sflToCanvasState(sfl);
  const lines = sfl.split('\n');
  const parents = new Map(state.canvasObjects.map(candidate => [candidate.id, candidate.parentFrameId]));
  const moving = new Set(events.map(event => event.owner.id));
  const hasMovingAncestor = (id: string): boolean => {
    const seen = new Set<string>();
    for (let parent = parents.get(id); parent && !seen.has(parent); parent = parents.get(parent)) {
      if (moving.has(parent)) {
        return true;
      }
      seen.add(parent);
    }
    return false;
  };
  for (const event of events) {
    if (hasMovingAncestor(event.owner.id)) {
      continue;
    }
    const canvasObject = state.canvasObjects.find(candidate => candidate.id === event.owner.id);
    const range = canvasObject ? findOwnerBlock(lines, event.owner.id) : null;
    if (!canvasObject || !range) {
      continue;
    }
    if (event.owner.role === 'path') {
      movePathPoints(lines, range, event.dx, event.dy);
      continue;
    }
    const parent = canvasObject.parentFrameId
      ? state.canvasObjects.find(candidate => candidate.id === canvasObject.parentFrameId)
      : undefined;
    setOrInsertLayoutTuples(lines, range, [
      ['position', canvasObject.x - (parent?.x ?? 0) + event.dx, canvasObject.y - (parent?.y ?? 0) + event.dy],
    ]);
  }
  return lines.join('\n');
}

export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  return applyMoveChanges(sfl, [event]);
}
