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

// Same idea as stripStringsAndComments, but LENGTH-PRESERVING: string and
// comment bodies become blank space rather than being collapsed, so a
// character offset computed against the masked text is still valid for
// slicing the ORIGINAL line. findDirectProperty below needs that — it
// returns exact column spans to splice, and stripStringsAndComments' `""`
// collapse would shift every offset after a string on the same line.
function maskStringsAndComments(line: string): string {
  return line
    .replace(/\/\/.*$/, m => ' '.repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, m => `"${' '.repeat(m.length - 2)}"`);
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
 *  child entities, each with their own `layout {}` one level deeper).
 *
 *  Narrow gap: `headerRe` is matched per LINE (`i > range.start`), so a child
 *  header sharing its owner's own opening-brace line (`Entity a { layout {
 *  ... } }`, all one line) isn't found here — only the realistic case, where
 *  the child has its own line even if that line is itself compact (`Entity a
 *  {\n  layout { position: 0,0; size: 100,50 }\n}`), is. The one caller that
 *  needs the single-line case too (setOrInsertLayoutTuples, for `layout {}`)
 *  works around it directly rather than fixing it here — see that function's
 *  own comment. */
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

interface PropertySpan { line: number; start: number; end: number }

/**
 * A `key: value` property directly inside `range` (not one belonging to a
 * nested child block) — returns the exact character span of its VALUE, from
 * just past the colon to the next `;`/the block's own closing `}`/end of
 * line, so a caller can splice precisely that span.
 *
 * This used to match only `^\s*key\s*:` per line, which silently could never
 * find a property packed onto a single-line block's own header line (e.g.
 * `layout { position: 80, 80; size: 200, 80 }`, or a whole `Link l1 { from:
 * a; to: b }`) — that property IS at depth 1, just not at the start of a
 * line. Every `apply*Change` function routes through here, so on any
 * single-line-formatted block (routine output from an LLM optimizing for
 * fewer tokens, and valid SFL either way) the old version always reported
 * "not found," and every caller's insert-fallback then spliced a DUPLICATE
 * property in beside the block instead of updating the real one — the real
 * value never changed, while stray, unread lines accumulated with every
 * edit. A char-by-char depth walk (mirroring blockEndLine's own reasoning)
 * finds the property wherever it sits on the line.
 *
 * `targetDepth` defaults to 1 (a property directly inside `range` itself).
 * Passing 2 finds one nested one level deeper without needing that inner
 * block's own range - see setOrInsertLayoutTuples' single-line-owner branch,
 * where the child `layout {}` block can't be isolated as its own LineRange
 * in the first place (it shares its owner's one physical line), but
 * `position`/`size` sitting two braces deep can still be found and spliced
 * directly against the owner's own range.
 */
function findDirectProperty(lines: string[], range: LineRange, key: string, targetDepth = 1): PropertySpan | null {
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

/**
 * Inserts `text` (a single already-indented property line's worth of
 * content, no trailing newline) as a new direct child of `range`. For a
 * multi-line block this is a new line right after the opening one — the
 * existing convention. For a SINGLE-line block (`range.start === range.end`,
 * e.g. `layout { size: 200, 80 }`) there IS no "line after the opening
 * line" that's still inside the block — splicing one in the old way landed
 * it as a sibling of the block, past its closing brace, which is the other
 * half of the bug findDirectProperty's doc comment describes. Instead this
 * inserts inline, right before that line's own closing `}`, keeping the
 * block on one line.
 */
function insertDirectProperty(lines: string[], range: LineRange, indent: string, key: string, value: string): void {
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
/**
 * Escapes a value for a short `"…"` string, which is the only string form this
 * file emits. The lexer accepts exactly four escapes there (`\"`, `\\`, `\n`,
 * `\t`) and *throws* on a literal newline — so a multi-line label (a shape
 * captioned "Kai Havertz\nST · drops deep", say) written out raw produced SFL
 * that no longer parses, and every patch carrying one silently failed.
 *
 * Order matters: backslashes first, so the escapes added afterwards aren't
 * escaped a second time. CR has no escape sequence in the grammar at all, so
 * CRLF/CR is normalised to LF rather than being emitted as something the lexer
 * would reject.
 */
const escapeSflString = (value: string): string => value
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\r\n?/g, '\n')
  .replace(/\n/g, '\\n')
  .replace(/\t/g, '\\t');

function setOrInsertText(lines: string[], range: LineRange, text: string): void {
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
function setOrInsertLayoutTuples(lines: string[], range: LineRange, props: ReadonlyArray<readonly [key: string, a: number, b: number]>): void {
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
function setEndpoint(lines: string[], range: LineRange, key: 'from' | 'to', targetName: string, side: Side, fraction: number): void {
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
  
  for (const r of outer) 
  {
    lines.splice(r.start, r.end - r.start + 1);
  }
    
    
    
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
  
  if (options.text !== undefined) 
  {
    block.push(`${bodyIndent}text: "${escapeSflString(options.text)}"`);
  }
    
    
  if (options.body) block.push(...indentBlock(options.body, bodyIndent));
  block.push(`${baseIndent}}`);

  lines.splice(model.end, 0, ...block);
  return lines.join('\n');
}

/** Removes a Link's whole block. A no-op if `id` isn't found. */
export function removeLink(sfl: string, id: string): string {
  const lines = sfl.split('\n');
  const range = findOwnerBlock(lines, id);
  
  if (!range) 
  {
    return sfl;
  }  
    
  lines.splice(range.start, range.end - range.start + 1);
  
  return lines.join('\n');
}
