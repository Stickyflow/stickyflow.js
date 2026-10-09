export const NAMED_BLOCK_KINDS = [
  'Project',
  'Model',
  'Group',
  'Entity',
  'Container',
  'Path',
  'Chart',
  'Shape',
  'Isometric',
  'Link',
  'Connection',
  'Layout',
  'Style',
  'Axis',
  'Series',
  'Rule',
  'Net',
  'Symbol',
  'Port',
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
  | { type: 'data'; data: SflBlock };

export interface SflProperty {
  key: string;
  value: SflValue;
}

export interface SflLayout {
  properties: SflProperty[];
}

export interface SflStyle {
  properties: SflProperty[];
}

export type SflValue =
  | SflStringValue
  | SflNumberValue
  | SflTupleValue
  | SflListValue
  | SflIdentValue
  | SflEndpointValue;

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
export const isBlockKind = (s: string): s is BlockKind => (BLOCK_KINDS as readonly string[]).includes(s);
export const isNamedBlockKind = (s: string): s is NamedBlockKind =>
  (NAMED_BLOCK_KINDS as readonly string[]).includes(s);
