import type { SflExpr, SflValue } from '../ast';
import { callFunction } from './functions';
import { fail, numberOf, type Scalar, type Scope } from './scope';

export function evaluate(scope: Scope, expr: SflExpr): Scalar {
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'boolean':
      return expr.value;
    case 'ref': {
      const name = expr.path.join('.');
      const value = scope.vars.get(name) ?? scope.params.get(name);
      if (value === undefined) {
        fail(scope, `unknown name ${name}`);
      }
      return value;
    }
    case 'unary': {
      const operand = evaluate(scope, expr.operand);
      return expr.operator === '-' ? -numberOf(scope, operand, 'a minus') : !operand;
    }
    case 'call':
      return callFunction(
        scope,
        expr.callee.join('.'),
        expr.args.map(arg => evaluate(scope, arg)),
      );
    case 'binary': {
      const left = evaluate(scope, expr.left);
      const right = evaluate(scope, expr.right);
      switch (expr.operator) {
        case '+':
          return typeof left === 'string' || typeof right === 'string'
            ? `${left}${right}`
            : numberOf(scope, left, '+') + numberOf(scope, right, '+');
        case '-':
          return numberOf(scope, left, '-') - numberOf(scope, right, '-');
        case '*':
          return numberOf(scope, left, '*') * numberOf(scope, right, '*');
        case '/':
          return numberOf(scope, left, '/') / numberOf(scope, right, '/');
        case '>':
          return numberOf(scope, left, '>') > numberOf(scope, right, '>');
        case '<':
          return numberOf(scope, left, '<') < numberOf(scope, right, '<');
        case '>=':
          return numberOf(scope, left, '>=') >= numberOf(scope, right, '>=');
        case '<=':
          return numberOf(scope, left, '<=') <= numberOf(scope, right, '<=');
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '&&':
          return Boolean(left) && Boolean(right);
        case '||':
          return Boolean(left) || Boolean(right);
      }
    }
  }
}

export const round = (value: number) => Math.round(value * 1000) / 1000;

function scalarValue(scope: Scope, only: Scalar): SflValue {
  if (typeof only === 'number') {
    return { type: 'number', value: round(numberOf(scope, only, 'a value')) };
  }
  if (typeof only === 'string') {
    return { type: 'string', value: only };
  }
  return { type: 'ident', segments: [String(only)] };
}

export function resolveValue(scope: Scope, value: SflValue): SflValue {
  // A field of the row a Repeat is at, written alone as `text: house.name`.
  if (value.type === 'ident' && value.segments.length > 1) {
    const field = scope.vars.get(value.segments.join('.'));
    if (field !== undefined) {
      return scalarValue(scope, field);
    }
  }
  // A name alone is the value of that name, wherever it stands: a parameter of a Template, a name of a Repeat or of its cell, or a
  // Parameter. A word that nothing is called stays a word, as `textAlign: left`.
  if (value.type === 'ident' && value.segments.length === 1) {
    const known = scope.vars.get(value.segments[0]) ?? scope.params.get(value.segments[0]);
    if (known !== undefined) {
      return scalarValue(scope, known);
    }
  }
  if (value.type === 'list') {
    return { type: 'list', values: value.values.map(item => resolveValue(scope, item)) };
  }
  if (value.type !== 'expr') {
    return value;
  }
  const results = value.items.map(item => evaluate(scope, item));
  if (results.length === 1) {
    return scalarValue(scope, results[0]);
  }
  return { type: 'tuple', values: results.map(result => round(numberOf(scope, result, 'a tuple'))) };
}
