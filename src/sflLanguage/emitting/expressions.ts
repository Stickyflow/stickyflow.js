import type { SflBinding, SflExpr } from '../ast';
import { emitValue } from './values';

const PRECEDENCE: Record<string, number> = { '==': 1, '!=': 1, '>': 1, '<': 1, '>=': 1, '<=': 1, '+': 2, '-': 2, '*': 3, '/': 3 };

export function emitExpression(expr: SflExpr, parentPrecedence = 0): string {
  switch (expr.kind) {
    case 'number':
      return String(expr.value);
    case 'string':
      return emitValue({ type: 'string', value: expr.value });
    case 'ref':
      return expr.path.join('.');
    case 'unary':
      return `${expr.operator}${emitExpression(expr.operand, 4)}`;
    case 'call':
      return `${expr.callee.join('.')}(${expr.args.map(arg => emitExpression(arg)).join(', ')})`;
    case 'binary': {
      const precedence = PRECEDENCE[expr.operator];
      const text = `${emitExpression(expr.left, precedence)} ${expr.operator} ${emitExpression(expr.right, precedence + 1)}`;
      return precedence < parentPrecedence ? `(${text})` : text;
    }
  }
}

export const emitBinding = (binding: SflBinding): string =>
  `${binding.key}: ${binding.operator} ${emitExpression(binding.expr)}`;
