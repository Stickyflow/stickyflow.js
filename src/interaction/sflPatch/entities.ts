import { sflToCanvasState } from '../../sfl'
import { VALID_IDENT, blockEndLine, findFirstBlockOfKind, findOwnerBlock, nameExists, type LineRange } from './scanner'
import { escapeSflString, indentBlock, indentOf, round1 } from './format'

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
  for (const r of outer) {
    lines.splice(r.start, r.end - r.start + 1);
  }

  return lines.join('\n');
}
