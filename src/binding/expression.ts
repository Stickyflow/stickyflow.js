import type { SflExpr } from '../sflLanguage/ast';
import { type BindingType, type BindingValue, sameType, typeName } from './types';

export interface TypeScope {
  resolve(path: string[]): BindingType | undefined;
}

export interface ValueEnv {
  read(path: string[]): BindingValue;
}

type Report = (code: string, message: string) => void;

const isNumeric = (type: BindingType): boolean => type === 'number' || (typeof type === 'object' && type.list === 'number');
const isList = (type: BindingType): boolean => typeof type === 'object';

export function collectRefs(expr: SflExpr): string[][] {
  switch (expr.kind) {
    case 'ref':
      return [expr.path];
    case 'unary':
      return collectRefs(expr.operand);
    case 'binary':
      return [...collectRefs(expr.left), ...collectRefs(expr.right)];
    case 'call':
      return expr.args.flatMap(collectRefs);
    default:
      return [];
  }
}

function inferBinary(expr: Extract<SflExpr, { kind: 'binary' }>, scope: TypeScope, report: Report): BindingType | undefined {
  const left = inferType(expr.left, scope, report);
  const right = inferType(expr.right, scope, report);
  if (!left || !right) {
    return undefined;
  }
  const { operator } = expr;
  if (['>', '<', '>=', '<='].includes(operator)) {
    if (left !== 'number' || right !== 'number') {
      report('type-mismatch', `'${operator}' compares two numbers, got ${typeName(left)} and ${typeName(right)}.`);
      return undefined;
    }
    return 'boolean';
  }
  if (operator === '==' || operator === '!=') {
    if (isList(left) || !sameType(left, right)) {
      report('type-mismatch', `'${operator}' compares two values of the same simple type, got ${typeName(left)} and ${typeName(right)}.`);
      return undefined;
    }
    return 'boolean';
  }
  if (operator === '+' && !isList(left) && !isList(right) && (left === 'string' || right === 'string')) {
    return 'string';
  }
  if (!isNumeric(left) || !isNumeric(right)) {
    report('type-mismatch', `'${operator}' needs numbers, got ${typeName(left)} and ${typeName(right)}.`);
    return undefined;
  }
  return isList(left) || isList(right) ? { list: 'number' } : 'number';
}

function inferCall(expr: Extract<SflExpr, { kind: 'call' }>, scope: TypeScope, report: Report): BindingType | undefined {
  const name = expr.callee.join('.');
  if (name !== 'when') {
    report('unknown-function', `Unknown function '${name}'. Only when(condition, then, else) is available in expressions.`);
    return undefined;
  }
  if (expr.args.length !== 3) {
    report('wrong-arguments', 'when(condition, then, else) takes exactly three arguments.');
    return undefined;
  }
  const [condition, whenTrue, whenFalse] = expr.args.map(arg => inferType(arg, scope, report));
  if (!condition || !whenTrue || !whenFalse) {
    return undefined;
  }
  if (condition !== 'boolean') {
    report('type-mismatch', `The condition of when() must be boolean, got ${typeName(condition)}.`);
    return undefined;
  }
  if (!sameType(whenTrue, whenFalse)) {
    report('type-mismatch', `when() branches must have the same type, got ${typeName(whenTrue)} and ${typeName(whenFalse)}.`);
    return undefined;
  }
  return whenTrue;
}

export function inferType(expr: SflExpr, scope: TypeScope, report: Report): BindingType | undefined {
  switch (expr.kind) {
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'ref': {
      const type = scope.resolve(expr.path);
      if (!type) {
        report('unknown-reference', `Unknown reference '${expr.path.join('.')}'. Use <DataSource>.<field>.`);
      }
      return type;
    }
    case 'unary': {
      const operand = inferType(expr.operand, scope, report);
      const wanted = expr.operator === '!' ? 'boolean' : 'number';
      if (operand && operand !== wanted) {
        report('type-mismatch', `'${expr.operator}' needs a ${wanted}, got ${typeName(operand)}.`);
        return undefined;
      }
      return operand ? wanted : undefined;
    }
    case 'binary':
      return inferBinary(expr, scope, report);
    case 'call':
      return inferCall(expr, scope, report);
  }
}

function arithmetic(operator: string, left: number, right: number): number {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    default:
      return right === 0 ? 0 : left / right;
  }
}

// Numbers join text with at most one decimal.
const text = (value: BindingValue): string => (typeof value === 'number' ? String(Math.round(value * 10) / 10) : String(value));

function evaluateBinary(expr: Extract<SflExpr, { kind: 'binary' }>, env: ValueEnv): BindingValue {
  const left = evaluate(expr.left, env);
  const right = evaluate(expr.right, env);
  switch (expr.operator) {
    case '>':
      return (left as number) > (right as number);
    case '<':
      return (left as number) < (right as number);
    case '>=':
      return (left as number) >= (right as number);
    case '<=':
      return (left as number) <= (right as number);
    case '==':
      return left === right;
    case '!=':
      return left !== right;
  }
  if (typeof left === 'string' || typeof right === 'string') {
    return text(left) + text(right);
  }
  const apply = (a: number, b: number) => arithmetic(expr.operator, a, b);
  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.min(left.length, right.length);
    return Array.from({ length }, (_value, index) => apply(left[index] as number, right[index] as number));
  }
  if (Array.isArray(left)) {
    return left.map(value => apply(value as number, right as number));
  }
  if (Array.isArray(right)) {
    return right.map(value => apply(left as number, value as number));
  }
  return apply(left as number, right as number);
}

export function evaluate(expr: SflExpr, env: ValueEnv): BindingValue {
  switch (expr.kind) {
    case 'number':
    case 'string':
      return expr.value;
    case 'ref':
      return env.read(expr.path);
    case 'unary': {
      const operand = evaluate(expr.operand, env);
      return expr.operator === '!' ? !operand : -(operand as number);
    }
    case 'binary':
      return evaluateBinary(expr, env);
    case 'call': {
      const [condition, whenTrue, whenFalse] = expr.args;
      return evaluate(condition, env) ? evaluate(whenTrue, env) : evaluate(whenFalse, env);
    }
  }
}
