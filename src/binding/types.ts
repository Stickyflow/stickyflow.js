import type { BindingOperator, BlockKind, SflExpr } from '../sflLanguage/ast';

export type ScalarType = 'number' | 'string' | 'boolean';
export type BindingType = ScalarType | { list: ScalarType };
export type BindingValue = number | string | boolean | number[] | string[] | boolean[];

// What a field is declared as. int and float are both numbers to the type check; int is also
// verified to be whole at run time. bool is boolean.
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

// A table source delivers rows and each field is a column; a record source delivers one object of scalars.
export type SourceMode = 'table' | 'record';

export type Row = Record<string, unknown>;

export interface DataSourceContract {
  name: string;
  mode: SourceMode;
  fields: Record<string, ScalarType>;
  // The type as written in the SFL (number, int, float, string, bool ...).
  declared: Record<string, string>;
  // Preview data written in the SFL; used while no real source is registered.
  sample?: Row | Row[];
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
  // [chart] for a chart, [chart, series] for a series, [shape] for a shape.
  ownerPath: string[];
  property: string;
  operator: BindingOperator;
  expr: SflExpr;
  type: BindingType;
  // "source.field" for every data source field the expression reads.
  dependencies: string[];
  line: number;
  col: number;
}
