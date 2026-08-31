import type { Side } from '../../model/geometry/router'
import { findChildBlock, findDirectProperty, insertDirectProperty, maskStringsAndComments, type LineRange } from './scanner'
import { escapeSflString, indentOf, round1, round2 } from './format'

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

/** Sets (or inserts) one or more numeric-tuple properties — `position`,
 *  `size` — inside the owner's own local `layout {}`, creating it right
 *  after the owner's opening brace if it doesn't have one yet. SFL's
 *  cascade (a local `layout {}` overrides a composed `Layout` reference)
 *  turns that into a per-owner override without touching a shared `Layout`
 *  block or any other owner that references it. Mutates `lines` in place;
 *  processes all `props` against one consistent block range instead of
 *  re-locating it between inserts, so a newly-inserted line never
 *  invalidates an index computed before it. */
export function setOrInsertLayoutTuples(lines: string[], range: LineRange, props: ReadonlyArray<readonly [key: string, a: number, b: number]>): void {
  let layout = findChildBlock(lines, range, /^\s*layout\s*\{/);
  // A single-line owner (`Entity a { text: "A"; layout { position: 0, 0 } }`,
  // all one physical line) can't be found by findChildBlock above - its
  // header search is per LINE, and there's no line "after" range.start left
  // inside a range that both starts and ends there (see findChildBlock's own
  // doc comment). Rather than isolate the layout block's own boundaries (not
  // expressible as a LineRange when it shares its owner's line), look for
  // `position`/`size` directly at depth 2 against the OWNER's own range -
  // two braces deep is exactly where they sit inside `layout {}` regardless
  // of which physical line that block happens to occupy.
  if (!layout && range.start === range.end && /\blayout\s*\{/.test(maskStringsAndComments(lines[range.start]))) {
    for (const [key, a, b] of props) {
      const existing = findDirectProperty(lines, range, key, 2);
      if (!existing) continue; // rare: a layout{} present but missing this one tuple - not worth a dedicated inserter
      const value = `${round1(a)}, ${round1(b)}`;
      const line = lines[existing.line];
      lines[existing.line] = `${line.slice(0, existing.start)}${value}${line.slice(existing.end)}`;
    }
    return;
  }
  if (!layout) {
    // No layout at all yet. On a single-line owner, a new line "after
    // range.start" would land past that line's own closing brace - outside
    // the owner entirely (same reasoning as insertDirectProperty's own
    // single-line branch) - so the block is inserted inline before it instead.
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
    // A single-line layout stays a single line (insertDirectProperty edits it
    // inline); a multi-line one gains a new line, which shifts `end` by one
    // so the NEXT prop in this same loop still resolves against the right range.
    layout = { start: layout.start, end: layout.end + (lines.length - lengthBefore) };
  }
}

/** Sets (or inserts) a Link's `from:`/`to:` endpoint — replaces the whole
 *  `path, side (fraction)` value, since a reconnect always changes all three
 *  parts together (a new target implies a new side/fraction on it too). */
export function setEndpoint(lines: string[], range: LineRange, key: 'from' | 'to', targetName: string, side: Side, fraction: number): void {
  const value = `${targetName}, ${side} (${round2(fraction)})`;
  const existing = findDirectProperty(lines, range, key);
  if (existing !== null) {
    const line = lines[existing.line];
    lines[existing.line] = `${line.slice(0, existing.start)}${value}${line.slice(existing.end)}`;
    return;
  }
  // from/to are required by the grammar — every real Link already has both;
  // this only matters for a hand-edited, otherwise-malformed document.
  const indent = `${indentOf(lines[range.start])}    `;
  insertDirectProperty(lines, range, indent, key, value);
}

