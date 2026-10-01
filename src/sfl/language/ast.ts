export type BlockKind =
  | 'Project'
  | 'Model'
  | 'Group'
  | 'Container'
  | 'Table'
  | 'Path'
  | 'Chart'
  | 'Shape'
  | 'Link'
  | 'Layout'
  | 'Style'
  | 'Columns'
  | 'Column'
  | 'Rows'
  | 'Row'
  | 'Axis'
  | 'Series'
  | 'Footer'
  | 'Rule'
  | 'Net'
  | 'Symbol'
  | 'Port'
  | 'data';

export const BLOCK_KINDS: readonly BlockKind[] = [
  'Project',
  'Model',
  'Group',
  'Container',
  'Table',
  'Path',
  'Chart',
  'Shape',
  'Link',
  'Layout',
  'Style',
  'Columns',
  'Column',
  'Rows',
  'Row',
  'Axis',
  'Series',
  'Rule',
  'Net',
  'Symbol',
  'Port',
  'Footer',
];

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
  multiline: boolean;
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

export const str = (value: string, multiline = false): SflStringValue => ({ type: 'string', value, multiline });
export const num = (value: number): SflNumberValue => ({ type: 'number', value });
export const tuple = (values: number[]): SflTupleValue => ({ type: 'tuple', values });
export const list = (values: SflValue[]): SflListValue => ({ type: 'list', values });
export const ident = (...segments: string[]): SflIdentValue => ({ type: 'ident', segments });
export const endpoint = (segments: string[], side?: Side, fraction?: number): SflEndpointValue => ({
  type: 'endpoint',
  segments,
  side,
  fraction,
});

export const isSide = (s: string): s is Side => (SIDES as readonly string[]).includes(s);
export const isBlockKind = (s: string): s is BlockKind => (BLOCK_KINDS as readonly string[]).includes(s);
