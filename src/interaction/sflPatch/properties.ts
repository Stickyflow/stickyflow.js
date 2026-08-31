import type { Side } from '../../model/geometry/router';
import { escapeSflString, indentOf, round1, round2 } from './format';
import {
  findChildBlock,
  findDirectProperty,
  insertDirectProperty,
  type LineRange,
  maskStringsAndComments,
} from './scanner';

export function setOrInsertText(lines: string[], range: LineRange, text: string): void {
  const value = `"${escapeSflString(text)}"`;
  const existing = findDirectProperty(lines, range, 'text');
  if (existing !== null) {
    const line = lines[existing.line];
    lines[existing.line] = `${line.slice(0, existing.start)}${value}${line.slice(existing.end)}`;
    return;
  }
  const indent = `${indentOf(lines[range.start])}    `;
  insertDirectProperty(lines, range, indent, 'text', value);
}

export function setOrInsertLayoutTuples(
  lines: string[],
  range: LineRange,
  props: ReadonlyArray<readonly [key: string, a: number, b: number]>,
): void {
  let layout = findChildBlock(lines, range, /^\s*layout\s*\{/);
  if (!layout && range.start === range.end && /\blayout\s*\{/.test(maskStringsAndComments(lines[range.start]))) {
    for (const [key, a, b] of props) {
      const existing = findDirectProperty(lines, range, key, 2);
      if (!existing) continue;
      const value = `${round1(a)}, ${round1(b)}`;
      const line = lines[existing.line];
      lines[existing.line] = `${line.slice(0, existing.start)}${value}${line.slice(existing.end)}`;
    }
    return;
  }
  if (!layout) {
    if (range.start === range.end) {
      const line = lines[range.start];
      const closeAt = line.lastIndexOf('}');
      const before = line.slice(0, closeAt).replace(/\s+$/, '');
      const sep = /\{$/.test(before) ? ' ' : '; ';
      const body = props.map(([key, a, b]) => `${key}: ${round1(a)}, ${round1(b)}`).join('; ');
      lines[range.start] = `${before}${sep}layout { ${body} } }${line.slice(closeAt + 1)}`;
      return;
    }
    const indent = `${indentOf(lines[range.start])}    `;
    const body = props.map(([key, a, b]) => `${indent}    ${key}: ${round1(a)}, ${round1(b)}`);
    lines.splice(range.start + 1, 0, `${indent}layout {`, ...body, `${indent}}`);
    return;
  }
  for (const [key, a, b] of props) {
    const value = `${round1(a)}, ${round1(b)}`;
    const existing = findDirectProperty(lines, layout, key);
    if (existing !== null) {
      const line = lines[existing.line];
      lines[existing.line] = `${line.slice(0, existing.start)}${value}${line.slice(existing.end)}`;
      continue;
    }
    const indent = `${indentOf(lines[layout.start])}    `;
    const lengthBefore = lines.length;
    insertDirectProperty(lines, layout, indent, key, value);
    layout = { start: layout.start, end: layout.end + (lines.length - lengthBefore) };
  }
}

export function setEndpoint(
  lines: string[],
  range: LineRange,
  key: 'from' | 'to',
  targetName: string,
  side: Side,
  fraction: number,
): void {
  const value = `${targetName}, ${side} (${round2(fraction)})`;
  const existing = findDirectProperty(lines, range, key);
  if (existing !== null) {
    const line = lines[existing.line];
    lines[existing.line] = `${line.slice(0, existing.start)}${value}${line.slice(existing.end)}`;
    return;
  }
  const indent = `${indentOf(lines[range.start])}    `;
  insertDirectProperty(lines, range, indent, key, value);
}
