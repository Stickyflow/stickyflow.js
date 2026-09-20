import { sflToCanvasState } from '../../../sfl';
import type { MoveChangeEvent } from '../../events';
import { replacePropertyValue } from '../edits/propertyValues';
import { round1 } from '../format';
import { setOrInsertLayoutTuples } from '../properties';
import { findDirectProperty, findOwnerBlock, type LineRange, type PropertySpan } from '../scanner';

const POINT_PAIR = /\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g;

function pointsSpan(lines: string[], range: LineRange): PropertySpan | null {
  const start = findDirectProperty(lines, range, 'points');
  if (start === null) {
    return null;
  }
  let depth = 0;
  for (let row = start.line; row <= range.end; row++) {
    const line = lines[row] ?? '';
    for (let column = row === start.line ? start.start : 0; column < line.length; column++) {
      if (line[column] === '[') {
        depth++;
      } else if (line[column] === ']' && --depth === 0) {
        return { line: start.line, start: start.start, endLine: row, end: column + 1 };
      }
    }
  }
  return null;
}

function readSpan(lines: string[], span: PropertySpan): string {
  if (span.line === span.endLine) {
    return lines[span.line].slice(span.start, span.end);
  }
  return [
    lines[span.line].slice(span.start),
    ...lines.slice(span.line + 1, span.endLine),
    lines[span.endLine].slice(0, span.end),
  ].join('\n');
}

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
  const entity = sflToCanvasState(sfl).entities.find(candidate => candidate.id === event.owner.id);
  if (!entity) {
    return sfl;
  }
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) {
    return sfl;
  }
  if (event.owner.role === 'path') {
    movePathPoints(lines, range, event.dx, event.dy);
    return lines.join('\n');
  }
  setOrInsertLayoutTuples(lines, range, [['position', entity.x + event.dx, entity.y + event.dy]]);
  return lines.join('\n');
}
