// src/features/sfl-language/sfl/ast.ts
// SFL 1.2 Abstract Syntax Tree.
// See docs/sfl-1.2-spezifikation.md §17 (EBNF) — this AST mirrors the grammar
// one-to-one. Entry order is preserved as parsed; the canonical emitter (§15)
// re-orders on output, so the AST itself is round-trip-neutral.

// `Container` = räumlicher Container (Frame/Swimlane/…, unterschieden per
// `kind:`); enthält gruppierte oder einzelne Entities. `Entity` bleibt das Blatt.
// `Layout`/`Style` sind wiederverwendbare, referenzierbare Blätter (§8/§9).
export type BlockKind =
  | 'Project' | 'Model' | 'Group' | 'Container' | 'Entity' | 'Link' | 'Layout' | 'Style'
  | 'Columns' | 'Column' | 'Rows' | 'Row';

export const BLOCK_KINDS: readonly BlockKind[] = [
  'Project', 'Model', 'Group', 'Container', 'Entity', 'Link', 'Layout', 'Style',
  'Columns', 'Column', 'Rows', 'Row',
];

export type Side = 'top' | 'bottom' | 'left' | 'right';

export const SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right'];

/** Document root: `sfl 1.2` header + a sequence of top-level blocks. */
export interface SflDocument {
  version: string;        // e.g. "1.2" (verbatim from the header)
  blocks: SflBlock[];
}

/**
 * A block: `Kind Name [: composition-list] { entries }`.
 * `composition` holds the raw identifiers after the colon, in authored order
 * (§8/§17: `identifier , { "&" , identifier }`). Whether a given ref is a
 * Style or a Layout reference is a semantic question resolved by looking up
 * the ref's target block kind (§9) — the parser stays purely syntactic and
 * does not classify them.
 */
export interface SflBlock {
  kind: BlockKind;
  name: string;           // identifier after the block kind
  composition: string[];  // optional `: Ref & Ref`, 0..n, authored order
  entries: SflEntry[];    // properties / nested blocks / layout / style, in parse order
}

/**
 * An entry inside a block. Kept as a tagged union (rather than four arrays)
 * so parse order is preserved verbatim for round-trip; the emitter groups them.
 */
export type SflEntry =
  | { type: 'property'; property: SflProperty }
  | { type: 'block'; block: SflBlock }
  | { type: 'layout'; layout: SflLayout }
  | { type: 'style'; style: SflStyle };

/** `key: value` (newline-terminated). */
export interface SflProperty {
  key: string;
  value: SflValue;
}

/** The `layout { … }` sub-block — only properties, no nested blocks (§5). */
export interface SflLayout {
  properties: SflProperty[];
}

/** The `style { … }` sub-block — only properties, no nested blocks (§5). */
export interface SflStyle {
  properties: SflProperty[];
}

// ─── Values (§7 / §17) ────────────────────────────────────────────────────

export type SflValue =
  | SflStringValue
  | SflNumberValue
  | SflTupleValue
  | SflListValue
  | SflIdentValue
  | SflEndpointValue;

/** `"…"` or `"""…"""`. `multiline` drives whether the emitter uses `"""` (§15.6). */
export interface SflStringValue {
  type: 'string';
  value: string;
  multiline: boolean;
}

export interface SflNumberValue {
  type: 'number';
  value: number;
}

/** `position: 100, 100` — two or more comma-separated numbers (§17 tuple). */
export interface SflTupleValue {
  type: 'tuple';
  values: number[];
}

/** `tags: ["a", "b"]` — bracketed, comma-separated values (§7.1). */
export interface SflListValue {
  type: 'list';
  values: SflValue[];
}

/**
 * A bare identifier or dot-path (`pill`, `cart.load_cart`). Syntactically a
 * keyword and a single-segment path are identical (§7.2); the distinction is
 * semantic (resolved by property name), so both share this node. Emits as
 * `segments.join('.')`.
 */
export interface SflIdentValue {
  type: 'ident';
  segments: string[];
}

/**
 * `from`/`to` only (§11.1): `path [side [fraction]]`.
 * Not a general value type — the parser produces it exclusively for from/to.
 */
export interface SflEndpointValue {
  type: 'endpoint';
  segments: string[];     // the referenced path
  side?: Side;            // optional top/bottom/left/right
  fraction?: number;      // optional 0.0–1.0
}

// ─── Small constructors (keep call sites terse) ────────────────────────────

export const str = (value: string, multiline = false): SflStringValue => ({ type: 'string', value, multiline });
export const num = (value: number): SflNumberValue => ({ type: 'number', value });
export const tuple = (values: number[]): SflTupleValue => ({ type: 'tuple', values });
export const list = (values: SflValue[]): SflListValue => ({ type: 'list', values });
export const ident = (...segments: string[]): SflIdentValue => ({ type: 'ident', segments });
export const endpoint = (segments: string[], side?: Side, fraction?: number): SflEndpointValue =>
  ({ type: 'endpoint', segments, side, fraction });

export const isSide = (s: string): s is Side => (SIDES as readonly string[]).includes(s);
export const isBlockKind = (s: string): s is BlockKind => (BLOCK_KINDS as readonly string[]).includes(s);
