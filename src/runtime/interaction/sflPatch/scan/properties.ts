import type { LineRange } from './blocks';
import { type MaskedSource, maskSource } from './sourceMask';

export interface PropertySpan {
  line: number;
  start: number;
  endLine: number;
  end: number;
}

interface Cursor {
  row: number;
  col: number;
}

interface LineDepthScan {
  depthAt: number[];
  endDepth: number;
}

interface ValueLineScan {
  depth: number;
  endColumn?: number;
}

export function findDirectProperty(
  lines: string[],
  range: LineRange,
  key: string,
  targetDepth = 1,
): PropertySpan | null {
  const source = maskSource(lines);
  if (source === null) {
    return null;
  }

  const keyPattern = new RegExp(`\\b${key}\\b\\s*:\\s*`, 'g');
  let depth = 0;
  for (let row = range.start; row <= range.end; row++) {
    const line = source.lines[row];
    if (line === undefined) {
      break;
    }
    const depthScan = scanLineDepths(line, depth);
    const valueStart = findPropertyValueStart(line, keyPattern, depthScan.depthAt, targetDepth);
    if (valueStart !== null) {
      return createPropertySpan(source, { row, col: valueStart }, range.end, targetDepth);
    }
    depth = depthScan.endDepth;
  }
  return null;
}

function scanLineDepths(line: string, startDepth: number): LineDepthScan {
  const depthAt = new Array<number>(line.length);
  let depth = startDepth;
  for (let column = 0; column < line.length; column++) {
    depthAt[column] = depth;
    if (line[column] === '{') {
      depth++;
    } else if (line[column] === '}') {
      depth--;
    }
  }
  return { depthAt, endDepth: depth };
}

function findPropertyValueStart(
  line: string,
  keyPattern: RegExp,
  depthAt: number[],
  targetDepth: number,
): number | null {
  keyPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: canonical RegExp.exec loop
  while ((match = keyPattern.exec(line))) {
    if (depthAt[match.index] === targetDepth) {
      return match.index + match[0].length;
    }
    keyPattern.lastIndex = match.index + 1;
  }
  return null;
}

function createPropertySpan(source: MaskedSource, from: Cursor, lastRow: number, targetDepth: number): PropertySpan {
  const end = trimBack(source.lines, from, findValueEnd(source, from, lastRow, targetDepth));
  return { line: from.row, start: from.col, endLine: end.row, end: end.col };
}

function findValueEnd(source: MaskedSource, from: Cursor, lastRow: number, targetDepth: number): Cursor {
  let depth = targetDepth;
  for (let row = from.row; row <= lastRow; row++) {
    const line = source.lines[row];
    if (line === undefined) {
      break;
    }
    const lineScan = scanValueLine(line, row === from.row ? from.col : 0, depth, targetDepth);
    if (lineScan.endColumn !== undefined) {
      return { row, col: lineScan.endColumn };
    }
    if (!source.continuesString[row]) {
      return { row, col: line.length };
    }
    depth = lineScan.depth;
  }
  return { row: lastRow, col: source.lines[lastRow]?.length ?? 0 };
}

function scanValueLine(line: string, startColumn: number, startDepth: number, targetDepth: number): ValueLineScan {
  let depth = startDepth;
  for (let column = startColumn; column < line.length; column++) {
    const character = line[column];
    if (character === '{') {
      depth++;
    } else if (character === '}') {
      if (depth <= targetDepth) {
        return { depth, endColumn: column };
      }
      depth--;
    } else if (character === ';' && depth === targetDepth) {
      return { depth, endColumn: column };
    }
  }
  return { depth };
}

function trimBack(masked: string[], from: Cursor, end: Cursor): Cursor {
  let row = end.row;
  let column = end.col;
  for (;;) {
    const line = masked[row] ?? '';
    while (column > 0 && /\s/.test(line[column - 1])) {
      column--;
    }
    if (column > 0 || row <= from.row) {
      return { row, col: column };
    }
    row--;
    column = masked[row]?.length ?? 0;
  }
}
