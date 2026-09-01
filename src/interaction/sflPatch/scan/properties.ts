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

function findValueEnd(source: MaskedSource, from: Cursor, lastRow: number, targetDepth: number): Cursor {
  let depth = targetDepth;
  for (let row = from.row; row <= lastRow; row++) {
    const line = source.lines[row];
    if (line === undefined) {
      break;
    }
    for (let col = row === from.row ? from.col : 0; col < line.length; col++) {
      const character = line[col];
      if (character === '{') {
        depth++;
      } else if (character === '}') {
        if (depth <= targetDepth) {
          return { row, col };
        }
        depth--;
      } else if (character === ';' && depth === targetDepth) {
        return { row, col };
      }
    }
    if (!source.continuesString[row]) {
      return { row, col: line.length };
    }
  }
  return { row: lastRow, col: source.lines[lastRow]?.length ?? 0 };
}

function trimBack(masked: string[], from: Cursor, end: Cursor): Cursor {
  let row = end.row;
  let col = end.col;
  for (;;) {
    const line = masked[row] ?? '';
    while (col > 0 && /\s/.test(line[col - 1])) {
      col--;
    }
    if (col > 0 || row <= from.row) {
      return { row, col };
    }
    row--;
    col = masked[row]?.length ?? 0;
  }
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

  const keyRe = new RegExp(`\\b${key}\\b\\s*:\\s*`, 'g');
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    const line = source.lines[i];
    if (line === undefined) {
      break;
    }

    const depthAt: number[] = new Array(line.length);
    let running = depth;
    for (let c = 0; c < line.length; c++) {
      depthAt[c] = running;
      if (line[c] === '{') {
        running++;
      } else if (line[c] === '}') {
        running--;
      }
    }

    keyRe.lastIndex = 0;
    let match: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: canonical RegExp.exec loop
    while ((match = keyRe.exec(line))) {
      if (depthAt[match.index] === targetDepth) {
        const from: Cursor = { row: i, col: match.index + match[0].length };
        const end = trimBack(source.lines, from, findValueEnd(source, from, range.end, targetDepth));
        return { line: i, start: from.col, endLine: end.row, end: end.col };
      }
      keyRe.lastIndex = match.index + 1;
    }
    depth = running;
  }
  return null;
}
