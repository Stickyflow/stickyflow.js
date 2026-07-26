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

// Table (§12.1a) was missing here until now — applyMoveChange/applyResizeChange/
// applyTextChange silently no-op'd for a Table block using the dedicated
// `Table` keyword (only the legacy `Container … { kind: table }` form worked).
const OWNER_HEADER = /^\s*(Entity|Container|Table|Link)\s+([A-Za-z_][A-Za-z0-9_]*)\b/;
const VALID_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

/** The line on which the block opened at `startLine` closes — walked
 *  character-by-character (not a per-line net brace count) because a block
 *  that opens AND closes on its own header line (e.g. `Entity b { layout {
 *  position: 0, 0 } }`) nets to zero on that single line the same as a line
 *  with no braces at all; a whole-line delta can't tell "closed
 *  immediately" apart from "never opened". */
function blockEndLine(lines: string[], startLine: number): number {
  let depth = 0;
  for (let j = startLine; j < lines.length; j++) {
    for (const ch of stripStringsAndComments(lines[j])) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return j;
      }
    }
  }
  return lines.length - 1;
}

/** The full line range of the top-level Entity/Container/Link block named
 *  `id` — SFL ids are unique per the language's own name-resolution rules
 *  (spec §9), so the first header match is the only one there ever is. */
function findOwnerBlock(lines: string[], id: string): LineRange | null {
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OWNER_HEADER);
    if (!m || m[2] !== id) continue;
    return { start: i, end: blockEndLine(lines, i) };
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
      return { start: i, end: blockEndLine(lines, i) };
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

/** The full line range of the first top-level block of grammar kind `kind`
 *  (e.g. `Model`) — used to find where to append a new owner, not to look
 *  one up by name. Matches the same "first one wins" simplification
 *  `sflToCanvasState` itself uses for the document's `Model` block. */
function findFirstBlockOfKind(lines: string[], kind: string): LineRange | null {
  const re = new RegExp(`^\\s*${kind}\\s+([A-Za-z_][A-Za-z0-9_]*)\\b`);
  for (let i = 0; i < lines.length; i++) {
    if (!re.test(lines[i])) continue;
    return { start: i, end: blockEndLine(lines, i) };
  }
  return null;
}

/** Whether ANY Entity/Container/Table/Link already uses this name — SFL
 *  names are unique across every kind at once (spec §9), not per-kind, so
 *  insertEntity/insertLink refuse to create a second one rather than
 *  silently producing a document the resolver would reject. */
function nameExists(lines: string[], id: string): boolean {
  return lines.some(line => {
    const m = line.match(OWNER_HEADER);
    return !!m && m[2] === id;
  });
}

/** Prefixes every non-blank line of a caller-supplied raw-SFL fragment with
 *  `indent`, preserving whatever relative indentation the fragment already
 *  has internally (e.g. a `style { ... }` sub-block's own properties). */
function indentBlock(body: string, indent: string): string[] {
  return body.split('\n').map(line => (line.trim() ? `${indent}${line}` : line));
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

// ── Structural changes: create/delete, the one thing the event-driven
// applyXChange functions above can't do (they only ever edit a property of
// something that already exists). Same surgical philosophy — insert/remove
// exactly the lines for the new/removed block, touch nothing else — rather
// than porting the main app's full canvasStateToSfl (905 lines, mainly
// style/layout deduplication logic this package has no use for: it isn't
// serializing an in-memory canvas model, it's making a targeted change to
// SFL text that's already there).

export interface InsertEntityOptions {
  id: string;
  kind: 'shape' | 'frame' | 'swimlane' | 'table';
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Nest inside an existing Frame/Swimlane. `x`/`y` are still given in
   *  absolute (world) coordinates — the local `position:` written is
   *  resolved relative to the parent's own current (cascade-aware) position,
   *  same as applyMoveChange does for an existing entity. */
  parentId?: string;
  /** Extra lines injected verbatim into the new block (style properties, a
   *  table's Columns/Rows, …) — already valid SFL text, not a generic
   *  key/value formatter: SFL's quoting rules (bare keyword vs quoted
   *  string) depend on the specific property, not its JS type, so whoever
   *  is producing this already needs to know which is which. */
  body?: string;
}

/** Appends a new Entity/Container/Table block — `kind: 'frame'`/`'swimlane'`
 *  become a `Container` with the matching `kind:` property; `'table'`
 *  becomes a dedicated `Table` block (§12.1a); anything else becomes an
 *  `Entity`. A no-op if `id` isn't a valid identifier, already names
 *  something in the document, or `parentId` is given but doesn't exist —
 *  this never produces SFL the resolver would reject. */
export function insertEntity(sfl: string, options: InsertEntityOptions): string {
  if (!VALID_IDENT.test(options.id)) return sfl;
  const lines = sfl.split('\n');
  if (nameExists(lines, options.id)) return sfl;

  let parentRange: LineRange | null = null;
  let originX = 0, originY = 0;
  if (options.parentId) {
    const parent = sflToCanvasState(sfl).entities.find(e => e.id === options.parentId);
    if (!parent) return sfl;
    parentRange = findOwnerBlock(lines, options.parentId);
    if (!parentRange) return sfl;
    originX = parent.x;
    originY = parent.y;
  }

  const insertion = parentRange ?? findFirstBlockOfKind(lines, 'Model');
  if (!insertion) return sfl;

  const blockKindWord = options.kind === 'table' ? 'Table' : options.kind === 'shape' ? 'Entity' : 'Container';
  const baseIndent = `${indentOf(lines[insertion.start])}    `;
  const bodyIndent = `${baseIndent}    `;

  const block: string[] = [`${baseIndent}${blockKindWord} ${options.id} {`];
  if (options.kind === 'frame' || options.kind === 'swimlane') block.push(`${bodyIndent}kind: ${options.kind}`);
  if (options.text !== undefined) block.push(`${bodyIndent}text: "${escapeSflString(options.text)}"`);
  if (options.body) block.push(...indentBlock(options.body, bodyIndent));
  block.push(
    `${bodyIndent}layout {`,
    `${bodyIndent}    position: ${round1(options.x - originX)}, ${round1(options.y - originY)}`,
    `${bodyIndent}    size: ${round1(options.width)}, ${round1(options.height)}`,
    `${bodyIndent}}`,
    `${baseIndent}}`,
  );

  lines.splice(insertion.end, 0, ...block);
  return lines.join('\n');
}

export interface RemoveEntityOptions {
  /** Also remove any Link whose `from:`/`to:` references this entity — left
   *  in place, a dangling reference is a resolver error (spec §9, unknown
   *  reference). Default true. */
  alsoRemoveLinks?: boolean;
}

/** Removes an Entity/Container/Table's whole block. A no-op if `id` isn't
 *  found. By default also removes any Link attached to it — pass
 *  `{ alsoRemoveLinks: false }` to leave those as a (now-invalid, until
 *  reconnected) dangling reference instead. */
export function removeEntity(sfl: string, id: string, options: RemoveEntityOptions = {}): string {
  const alsoRemoveLinks = options.alsoRemoveLinks ?? true;
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, id);
  if (!range) return sfl;

  const ranges: LineRange[] = [range];
  if (alsoRemoveLinks) {
    const refRe = new RegExp(`\\b(from|to)\\s*:\\s*${id}\\b`);
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^\s*Link\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
      if (!m) { i++; continue; }
      const end = blockEndLine(lines, i);
      if (lines.slice(i, end + 1).some(l => refRe.test(l))) ranges.push({ start: i, end });
      i = end + 1;
    }
  }

  // A Link found above can be nested INSIDE the entity's own range (a Link
  // between two shapes in the same removed Frame lives inside it) — drop any
  // range fully contained in another one, or splicing both would double-count
  // and corrupt indices once the first splice shifts the rest of the file.
  const outer = ranges.filter(r => !ranges.some(other =>
    other !== r && other.start <= r.start && other.end >= r.end && (other.start !== r.start || other.end !== r.end),
  ));
  outer.sort((a, b) => b.start - a.start);
  for (const r of outer) lines.splice(r.start, r.end - r.start + 1);
  return lines.join('\n');
}

export interface InsertLinkOptions {
  id: string;
  fromId: string;
  toId: string;
  fromSide?: Side;
  fromFraction?: number;
  toSide?: Side;
  toFraction?: number;
  text?: string;
  /** Extra lines injected verbatim (style properties, markers, …) — same
   *  reasoning as InsertEntityOptions.body. */
  body?: string;
}

/** Appends a new Link block at the top (Model) level — SFL resolves `from:`/
 *  `to:` by bare name regardless of nesting (spec §10), so this doesn't need
 *  to match the main app's convention of nesting a link inside a shared
 *  Frame when both endpoints live in one. A no-op if `id` is invalid or
 *  already taken, or if `fromId`/`toId` don't name an existing entity. */
export function insertLink(sfl: string, options: InsertLinkOptions): string {
  if (!VALID_IDENT.test(options.id)) return sfl;
  const lines = sfl.split('\n');
  if (nameExists(lines, options.id)) return sfl;

  const state = sflToCanvasState(sfl);
  if (!state.entities.some(e => e.id === options.fromId)) return sfl;
  if (!state.entities.some(e => e.id === options.toId)) return sfl;

  const model = findFirstBlockOfKind(lines, 'Model');
  if (!model) return sfl;

  const baseIndent = `${indentOf(lines[model.start])}    `;
  const bodyIndent = `${baseIndent}    `;
  const endpoint = (id: string, side?: Side, fraction?: number) =>
    side ? `${id}, ${side}${fraction !== undefined ? ` (${round2(fraction)})` : ''}` : id;

  const block: string[] = [
    `${baseIndent}Link ${options.id} {`,
    `${bodyIndent}from: ${endpoint(options.fromId, options.fromSide, options.fromFraction)}`,
    `${bodyIndent}to: ${endpoint(options.toId, options.toSide, options.toFraction)}`,
  ];
  if (options.text !== undefined) block.push(`${bodyIndent}text: "${escapeSflString(options.text)}"`);
  if (options.body) block.push(...indentBlock(options.body, bodyIndent));
  block.push(`${baseIndent}}`);

  lines.splice(model.end, 0, ...block);
  return lines.join('\n');
}

/** Removes a Link's whole block. A no-op if `id` isn't found. */
export function removeLink(sfl: string, id: string): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, id);
  if (!range) return sfl;
  lines.splice(range.start, range.end - range.start + 1);
  return lines.join('\n');
}
