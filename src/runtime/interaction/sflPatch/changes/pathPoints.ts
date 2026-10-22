import { round1 } from '../format';
import { findDirectProperty, type LineRange, type PropertySpan } from '../scanner';

export function pointsSpan(lines: string[], range: LineRange): PropertySpan | null {
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

export function readSpan(lines: string[], span: PropertySpan): string {
  if (span.line === span.endLine) {
    return lines[span.line].slice(span.start, span.end);
  }
  return [
    lines[span.line].slice(span.start),
    ...lines.slice(span.line + 1, span.endLine),
    lines[span.endLine].slice(0, span.end),
  ].join('\n');
}

export function formatPoints(points: ReadonlyArray<{ x: number; y: number; tension?: number }>): string {
  const one = (point: { x: number; y: number; tension?: number }) =>
    point.tension === undefined
      ? `[${round1(point.x)}, ${round1(point.y)}]`
      : `[${round1(point.x)}, ${round1(point.y)}, ${round1(point.tension)}]`;
  return `[${points.map(one).join(', ')}]`;
}
