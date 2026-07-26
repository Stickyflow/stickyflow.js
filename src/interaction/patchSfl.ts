// Pure SFL text patcher — turns a textChange/moveChange/resizeChange event
// straight into updated SFL source, so a host doesn't have to hand-roll its
// own patcher (every earlier host of this package did, each with slightly
// different bugs — see the docs site's now-retired patchSflText.ts). No DOM,
// runs in Node — unlike the rest of `stickyflow/interaction`, which is
// browser-only, this module belongs equally to a server-side chatbot host
// with no viewer at all.
//
// Deliberately line/brace-depth based, not full AST-offset patching: the
// parser doesn't track source positions on nodes (nothing to splice from),
// and re-serializing the whole document (parse -> mutate -> emit) would
// require porting canvasStateToSfl AND a comment-preservation pass — see
// mergeSflSource.ts in the main app, which needs exactly that because full
// re-emission drops hand-written comments. Patching only the touched
// property's own line(s) sidesteps that problem entirely: everything else in
// the document — comments, formatting, unrelated blocks — is untouched
// automatically, because it's simply never read.
import { sflToCanvasState } from '../sfl';
import type { Side } from '../model/geometry/router';
import type { TextChangeEvent, MoveChangeEvent, ResizeChangeEvent, LinkReconnectEvent } from './events';

const OWNER_HEADER = /^\s*(Entity|Container|Link)\s+([A-Za-z_][A-Za-z0-9_]*)\b/;

// Braces inside strings/comments don't count toward nesting — same "blank
// out strings and comments before scanning" technique sflLintRules.ts uses
// for its own indentation tracking in the main app.
function stripStringsAndComments(line: string): string {
  return line.replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

function braceDelta(line: string): number {
  let delta = 0;
  for (const ch of stripStringsAndComments(line)) {
    if (ch === '{') delta++;
    else if (ch === '}') delta--;
  }
  return delta;
}

interface LineRange { start: number; end: number }

/** The full line range of the top-level Entity/Container/Link block named
 *  `id` — SFL ids are unique per the language's own name-resolution rules
 *  (spec §9), so the first header match is the only one there ever is. */
function findOwnerBlock(lines: string[], id: string): LineRange | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OWNER_HEADER);
    if (!m || m[2] !== id) continue;
    let depth = 0, end = i;
    for (let j = i; j < lines.length; j++) {
      depth += braceDelta(lines[j]);
      end = j;
      if (depth <= 0 && j > i) break;
    }
    return { start: i, end };
  }
  return null;
}

/** A direct child block matching `headerRe` inside `range` — depth-limited
 *  to an immediate child, so e.g. a Container's own `layout {}` is never
 *  confused with a nested Entity's (Containers can hold frame-relative
 *  child entities, each with their own `layout {}` one level deeper). */
function findChildBlock(lines: string[], range: LineRange, headerRe: RegExp): LineRange | null {
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    if (depth === 1 && i > range.start && headerRe.test(lines[i])) {
      let childDepth = 0, end = i;
      for (let j = i; j <= range.end; j++) {
        childDepth += braceDelta(lines[j]);
        end = j;
        if (childDepth <= 0 && j > i) break;
      }
      return { start: i, end };
    }
    depth += braceDelta(lines[i]);
  }
  return null;
}

/** A `key: ...` property one level directly inside `range` — not one
 *  belonging to a nested child block. */
function findDirectProperty(lines: string[], range: LineRange, key: string): number | null {
  const re = new RegExp(`^\\s*${key}\\b\\s*:`);
  let depth = 0;
  for (let i = range.start; i <= range.end; i++) {
    if (depth === 1 && i > range.start && re.test(lines[i])) return i;
    depth += braceDelta(lines[i]);
  }
  return null;
}

const indentOf = (line: string): string => line.match(/^[ \t]*/)?.[0] ?? '';
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const escapeSflString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function setOrInsertText(lines: string[], range: LineRange, text: string): void {
  const value = `"${escapeSflString(text)}"`;
  const existing = findDirectProperty(lines, range, 'text');
  if (existing !== null) {
    lines[existing] = lines[existing].replace(/text\b\s*:\s*"(?:[^"\\]|\\.)*"/, `text: ${value}`);
    return;
  }
  const indent = `${indentOf(lines[range.start])}    `;
  lines.splice(range.start + 1, 0, `${indent}text: ${value}`);
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
function setOrInsertLayoutTuples(lines: string[], range: LineRange, props: ReadonlyArray<readonly [key: string, a: number, b: number]>): void {
  let layout = findChildBlock(lines, range, /^\s*layout\s*\{/);
  if (!layout) {
    const indent = `${indentOf(lines[range.start])}    `;
    const body = props.map(([key, a, b]) => `${indent}    ${key}: ${round1(a)}, ${round1(b)}`);
    lines.splice(range.start + 1, 0, `${indent}layout {`, ...body, `${indent}}`);
    return;
  }
  for (const [key, a, b] of props) {
    const existing = findDirectProperty(lines, layout, key);
    if (existing !== null) {
      lines[existing] = lines[existing].replace(new RegExp(`${key}\\b\\s*:.*$`), `${key}: ${round1(a)}, ${round1(b)}`);
      continue;
    }
    const indent = `${indentOf(lines[layout.start])}    `;
    lines.splice(layout.start + 1, 0, `${indent}${key}: ${round1(a)}, ${round1(b)}`);
    layout = { start: layout.start, end: layout.end + 1 };
  }
}

/** Sets (or inserts) a Link's `from:`/`to:` endpoint — replaces the whole
 *  `path, side (fraction)` value, since a reconnect always changes all three
 *  parts together (a new target implies a new side/fraction on it too). */
function setEndpoint(lines: string[], range: LineRange, key: 'from' | 'to', targetName: string, side: Side, fraction: number): void {
  const value = `${targetName}, ${side} (${round2(fraction)})`;
  const existing = findDirectProperty(lines, range, key);
  if (existing !== null) {
    lines[existing] = lines[existing].replace(new RegExp(`${key}\\b\\s*:.*$`), `${key}: ${value}`);
    return;
  }
  // from/to are required by the grammar — every real Link already has both;
  // this only matters for a hand-edited, otherwise-malformed document.
  const indent = `${indentOf(lines[range.start])}    `;
  lines.splice(range.start + 1, 0, `${indent}${key}: ${value}`);
}

/** Applies a `textChange` event's new label to the owner's `text:` —
 *  inserted right after its opening brace if it doesn't have one yet (e.g. a
 *  previously unlabeled link). Works for both Entity and Link owners; a no-op
 *  if `owner.id` isn't found in `sfl` at all. */
export function applyTextChange(sfl: string, event: TextChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertText(lines, range, event.text);
  return lines.join('\n');
}

/** Applies a `moveChange` event's delta to the owner's `layout { position }`.
 *  Reads the CURRENT resolved position through the real parser/cascade
 *  (`sflToCanvasState`) rather than only ever looking at a local `layout {}`
 *  — an entity's position is just as often inherited from a composed
 *  `Layout` reference as set inline, and `dx`/`dy` need to add to whichever
 *  one is actually in effect. A no-op if `owner.id` isn't a known entity. */
export function applyMoveChange(sfl: string, event: MoveChangeEvent): string {
  const entity = sflToCanvasState(sfl).entities.find(e => e.id === event.owner.id);
  if (!entity) return sfl;
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertLayoutTuples(lines, range, [['position', entity.x + event.dx, entity.y + event.dy]]);
  return lines.join('\n');
}

/** Applies a `resizeChange` event's resulting absolute bounds to the owner's
 *  `layout { position, size }` — absolute, not delta, matching the event's
 *  own doc comment (a size is often inherited, so there may be nothing local
 *  to add a delta to). A no-op if `owner.id` isn't found in `sfl` at all. */
export function applyResizeChange(sfl: string, event: ResizeChangeEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setOrInsertLayoutTuples(lines, range, [['position', event.x, event.y], ['size', event.width, event.height]]);
  return lines.join('\n');
}

/** Applies a `linkReconnect` event's new anchor to the link's `from:`/`to:`
 *  endpoint (whichever `event.end` names) — the target entity, side, and
 *  fraction all change together as one value. A no-op if `owner.id` (the
 *  link) isn't found in `sfl` at all. */
export function applyLinkReconnectChange(sfl: string, event: LinkReconnectEvent): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, event.owner.id);
  if (!range) return sfl;
  setEndpoint(lines, range, event.end, event.target.id, event.side, event.fraction);
  return lines.join('\n');
}
