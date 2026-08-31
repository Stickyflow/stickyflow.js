import { maskStringsAndComments } from './lexical'

import type { LineRange } from './blocks'



export interface PropertySpan { line: number; start: number; end: number }



export function findDirectProperty(lines: string[], range: LineRange, key: string, targetDepth = 1): PropertySpan | null {
  const keyRe = new RegExp(`\\b${key}\\b\\s*:\\s*`, 'g');
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    const masked = maskStringsAndComments(lines[i]);
    // Depth just BEFORE each character, so a match's own depth is a lookup
    // rather than a re-walk from the start of the line.
    const depthAt: number[] = new Array(masked.length);
    let d = depth;
    for (let c = 0; c < masked.length; c++) {
      depthAt[c] = d;
      if (masked[c] === '{') d++;
      else if (masked[c] === '}') d--;
    }
    keyRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(masked))) {
      if (depthAt[m.index] === targetDepth) {
        const valueStart = m.index + m[0].length;
        let valueEnd = masked.length;
        let vd = depthAt[valueStart] ?? targetDepth;
        for (let c = valueStart; c < masked.length; c++) {
          const ch = masked[c];
          if (ch === '{') vd++;
          else if (ch === '}') { if (vd <= targetDepth) { valueEnd = c; break; } vd--; }
          else if (ch === ';' && vd === targetDepth) { valueEnd = c; break; }
        }
        // Trailing whitespace before the terminator belongs to formatting, not
        // the value — leaving it in the span would eat the space before a
        // block's closing `}` (no `;` follows a block's last property), e.g.
        // turning `to: a, left (0.5) }` into `to: <new value>}`.
        while (valueEnd > valueStart && /\s/.test(masked[valueEnd - 1])) valueEnd--;
        return { line: i, start: valueStart, end: valueEnd };
      }
      keyRe.lastIndex = m.index + 1; // don't let a zero/short match stall the scan
    }
    depth = d;
  }
  return null;
}

export function insertDirectProperty(lines: string[], range: LineRange, indent: string, key: string, value: string): void {
  if (range.start === range.end) {
    const line = lines[range.start];
    // The block's own closing brace — correct as long as the block isn't
    // sharing its physical line with an outer block's braces too (e.g. an
    // entity and its layout both squeezed onto one line); that narrower case
    // isn't handled precisely, same as the rest of this file's line-based
    // matching in general.
    const closeAt = line.lastIndexOf('}');
    if (closeAt !== -1) {
      const before = line.slice(0, closeAt).replace(/\s+$/, '');
      const sep = /\{$/.test(before) ? ' ' : '; ';
      lines[range.start] = `${before}${sep}${key}: ${value} }${line.slice(closeAt + 1)}`;
      return;
    }
  }
  lines.splice(range.start + 1, 0, `${indent}${key}: ${value}`);
}

