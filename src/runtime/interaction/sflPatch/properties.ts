import type { Side } from '../../../model/geometry/types';
import { insertDirectProperty, replacePropertyValue } from './edits/propertyValues';
import { childIndent } from './blockInsert';
import { escapeSflString, round1 } from './format';
import { formatLinkEndpoint } from './linkPatch/endpointText';
import { findChildBlock, findDirectProperty, type LineRange, maskLines } from './scanner';

type LayoutTuple = readonly [key: string, first: number, second: number, third?: number];

export interface LinkEndpointPatch {
  end: 'from' | 'to';
  targetName: string;
  side: Side;
  fraction: number;
}

export function setOrInsertText(lines: string[], range: LineRange, text: string): void {
  const value = `"${escapeSflString(text)}"`;
  const existing = findDirectProperty(lines, range, 'text');
  if (existing !== null) {
    replacePropertyValue(lines, existing, value);
    return;
  }
  insertDirectProperty(lines, range, childIndent(lines, range), 'text', value);
}

export function setOrInsertLayoutTuples(lines: string[], range: LineRange, props: ReadonlyArray<LayoutTuple>): void {
  const layout = findChildBlock(lines, range, /^\s*layout\s*\{/);
  if (layout) {
    updateLayoutBlock(lines, layout, props);
    return;
  }

  if (hasInlineLayout(lines, range)) {
    updateInlineLayout(lines, range, props);
    return;
  }

  if (range.start === range.end) {
    insertCompactLayout(lines, range.start, props);
  } else {
    insertMultilineLayout(lines, range, props);
  }
}

function hasInlineLayout(lines: string[], range: LineRange): boolean {
  const maskedStart = maskLines(lines)?.[range.start] ?? '';
  return range.start === range.end && /\blayout\s*\{/.test(maskedStart);
}

function updateInlineLayout(lines: string[], range: LineRange, props: ReadonlyArray<LayoutTuple>): void {
  for (const tuple of props) {
    const existing = findDirectProperty(lines, range, tuple[0], 2);
    if (existing) {
      replacePropertyValue(lines, existing, layoutTupleValue(tuple));
    }
  }
}

function insertCompactLayout(lines: string[], row: number, props: ReadonlyArray<LayoutTuple>): void {
  const line = lines[row];
  const closeAt = line.lastIndexOf('}');
  const before = line.slice(0, closeAt).replace(/\s+$/, '');
  const separator = /\{$/.test(before) ? ' ' : '; ';
  const body = props.map(tuple => `${tuple[0]}: ${layoutTupleValue(tuple)}`).join('; ');
  lines[row] = `${before}${separator}layout { ${body} } }${line.slice(closeAt + 1)}`;
}

function insertMultilineLayout(lines: string[], range: LineRange, props: ReadonlyArray<LayoutTuple>): void {
  const indent = childIndent(lines, range);
  const body = props.map(tuple => `${indent}    ${tuple[0]}: ${layoutTupleValue(tuple)}`);
  lines.splice(range.start + 1, 0, `${indent}layout {`, ...body, `${indent}}`);
}

function updateLayoutBlock(lines: string[], layout: LineRange, props: ReadonlyArray<LayoutTuple>): void {
  let currentLayout = layout;
  for (const tuple of props) {
    currentLayout = setLayoutTuple(lines, currentLayout, tuple);
  }
}

function setLayoutTuple(lines: string[], layout: LineRange, tuple: LayoutTuple): LineRange {
  const existing = findDirectProperty(lines, layout, tuple[0]);
  if (existing !== null) {
    replacePropertyValue(lines, existing, layoutTupleValue(tuple));
    return layout;
  }
  const indent = childIndent(lines, layout);
  const lengthBefore = lines.length;
  insertDirectProperty(lines, layout, indent, tuple[0], layoutTupleValue(tuple));
  return { start: layout.start, end: layout.end + (lines.length - lengthBefore) };
}

function layoutTupleValue(tuple: LayoutTuple): string {
  const base = `${round1(tuple[1])}, ${round1(tuple[2])}`;
  return tuple[3] === undefined ? base : `${base}, ${round1(tuple[3])}`;
}

export function setEndpoint(lines: string[], range: LineRange, patch: LinkEndpointPatch): void {
  const value = formatLinkEndpoint({ id: patch.targetName, side: patch.side, fraction: patch.fraction });
  const existing = findDirectProperty(lines, range, patch.end);
  if (existing !== null) {
    replacePropertyValue(lines, existing, value);
    return;
  }
  const indent = childIndent(lines, range);
  insertDirectProperty(lines, range, indent, patch.end, value);
}
