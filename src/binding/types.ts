import type { BindingOperator, BlockKind, SflExpr } from '../sflLanguage/ast';

export type ScalarType = 'number' | 'string' | 'boolean';
export type BindingType = ScalarType | { list: ScalarType };
export type BindingValue = number | string | boolean | number[] | string[] | boolean[];

export const SCALAR_TYPES: readonly ScalarType[] = ['number', 'string', 'boolean'];

export const isScalarType = (value: string): value is ScalarType => (SCALAR_TYPES as readonly string[]).includes(value);

export const typeName = (type: BindingType): string => (typeof type === 'string' ? type : `list<${type.list}>`);

export const sameType = (left: BindingType, right: BindingType): boolean => typeName(left) === typeName(right);

// A table source delivers rows and each field is a column; a record source delivers one object of scalars.
export type SourceMode = 'table' | 'record';

export interface DataSourceContract {
  name: string;
  mode: SourceMode;
  fields: Record<string, ScalarType>;
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
  ownerName: string;
  property: string;
  operator: BindingOperator;
  expr: SflExpr;
  type: BindingType;
  // "source.field" for every data source field the expression reads.
  dependencies: string[];
  line: number;
  col: number;
}
