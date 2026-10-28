export const NAMED_BLOCK_KINDS = [
  'Project',
  'Model',
  'Group',
  'Entity',
  'Container',
  'Path',
  'Chart',
  'Widget',
  'Component',
  'Shape',
  'Text',
  'Isometric',
  'Dimension',
  'Link',
  'Connection',
  'Layout',
  'Style',
  'Shader',
  'Axis',
  'Series',
  'Rule',
  'Net',
  'Symbol',
  'Port',
  'DataSource',
  'Repeat',
  'Template',
  'Use',
] as const;

export type NamedBlockKind = (typeof NAMED_BLOCK_KINDS)[number];
export type BlockKind = NamedBlockKind | 'data';

export const BLOCK_KINDS: readonly BlockKind[] = [...NAMED_BLOCK_KINDS, 'data'];

export type Side = 'top' | 'bottom' | 'left' | 'right';

export const SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right'];

export interface SflDocument {
  version: string;
  blocks: SflBlock[];
}

export interface SflBlock {
  kind: BlockKind;
  name: string;
  composition: string[];
  entries: SflEntry[];
}

export type SflEntry =
  | { type: 'property'; property: SflProperty }
  | { type: 'block'; block: SflBlock }
  | { type: 'layout'; layout: SflLayout }
  | { type: 'style'; style: SflStyle }
  | { type: 'data'; data: SflBlock }
  | { type: 'fields'; fields: SflProperty[] }
  | { type: 'binding'; binding: SflBinding }
  | { type: 'handler'; handler: SflHandler };

export type BindingOperator = '<-' | '<->' | '->';

export type ExpressionOperator = '+' | '-' | '*' | '/' | '>' | '<' | '>=' | '<=' | '==' | '!=' | '&&' | '||';

export type SflExpr =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'ref'; path: string[] }
  | { kind: 'unary'; operator: '!' | '-'; operand: SflExpr }
  | { kind: 'binary'; operator: ExpressionOperator; left: SflExpr; right: SflExpr }
  | { kind: 'call'; callee: string[]; args: SflExpr[] };

export interface SflBinding {
  key: string;
  operator: BindingOperator;
  expr: SflExpr;
  line: number;
  col: number;
}

export interface SflAssignment {
  target: string[];
  expr: SflExpr;
  line: number;
  col: number;
}

export interface SflHandler {
  event: string;
  assignments: SflAssignment[];
  line: number;
  col: number;
}

export interface SflProperty {
  key: string;
  value: SflValue;
}

export interface SflLayout {
  properties: SflProperty[];
}

export interface SflStyle {
  properties: SflProperty[];
  bindings?: SflBinding[];
}

export type SflValue =
  | SflStringValue
  | SflNumberValue
  | SflTupleValue
  | SflListValue
  | SflIdentValue
  | SflEndpointValue
  | SflExprValue;

// A value that is computed, like `col * 25, row * 12`. It is only valid inside a `Repeat`, which works it out for every cell.
export interface SflExprValue {
  type: 'expr';
  items: SflExpr[];
}

export interface SflStringValue {
  type: 'string';
  value: string;
}

export interface SflNumberValue {
  type: 'number';
  value: number;
}

export interface SflTupleValue {
  type: 'tuple';
  values: number[];
}

export interface SflListValue {
  type: 'list';
  values: SflValue[];
}

export interface SflIdentValue {
  type: 'ident';
  segments: string[];
}

export interface SflEndpointValue {
  type: 'endpoint';
  segments: string[];
  side?: Side;
  fraction?: number;
}

export const isSide = (s: string): s is Side => (SIDES as readonly string[]).includes(s);
export const isComponentBlockKind = (kind: string): boolean => kind === 'Component' || kind === 'Widget';

export const isBlockKind = (s: string): s is BlockKind => (BLOCK_KINDS as readonly string[]).includes(s);
export const isNamedBlockKind = (s: string): s is NamedBlockKind =>
  (NAMED_BLOCK_KINDS as readonly string[]).includes(s);
