import type { BindingOperator, BlockKind, SflExpr } from '../sflLanguage/ast';

export type ScalarType = 'number' | 'string' | 'boolean';
export type BindingType = ScalarType | { list: ScalarType };
export type BindingValue = number | string | boolean | number[] | string[] | boolean[];

const DECLARED: Record<string, ScalarType> = {
  number: 'number',
  int: 'number',
  float: 'number',
  string: 'string',
  boolean: 'boolean',
  bool: 'boolean',
};

export const scalarOf = (declared: string): ScalarType | undefined => DECLARED[declared];

export const typeName = (type: BindingType): string => (typeof type === 'string' ? type : `list<${type.list}>`);

export const sameType = (left: BindingType, right: BindingType): boolean => typeName(left) === typeName(right);

export type SourceMode = 'table' | 'record';

export type Row = Record<string, unknown>;

export interface DataSourceContract {
  name: string;
  mode: SourceMode;
  fields: Record<string, ScalarType>;
  declared: Record<string, string>;
}

export interface BindingDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  line: number;
  col: number;
}

export interface BoundProperty {
  id: string;
  ownerKind: BlockKind;
  ownerPath: string[];
  property: string;
  operator: BindingOperator;
  expr: SflExpr;
  type: BindingType;
  dependencies: string[];
  line: number;
  col: number;
}

export interface BoundAssignment {
  source: string;
  field: string;
  expr: SflExpr;
  type: ScalarType;
  line: number;
  col: number;
}

export interface BoundHandler {
  id: string;
  ownerKind: BlockKind;
  ownerPath: string[];
  event: string;
  assignments: BoundAssignment[];
  line: number;
  col: number;
}

export interface ElementInfo {
  kind: BlockKind;
  widgetType?: string;
}

export const POINTER_EVENTS = ['onPress', 'onRelease', 'onTap', 'onDrag'] as const;
export const TICK_EVENT = 'onTick';
