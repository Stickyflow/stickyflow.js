import type { SflAssignment, SflBinding, SflExpr, SflHandler } from '../ast';
import { emitValue } from './values';

const PRECEDENCE: Record<string, number> = { '||': 1, '&&': 2, '==': 3, '!=': 3, '>': 3, '<': 3, '>=': 3, '<=': 3, '+': 4, '-': 4, '*': 5, '/': 5 };

export function emitExpression(expr: SflExpr, parentPrecedence = 0): string {
  switch (expr.kind) {
    case 'number':
      return String(expr.value);
    case 'string':
      return emitValue({ type: 'string', value: expr.value });
    case 'boolean':
      return String(expr.value);
    case 'ref':
      return expr.path.join('.');
    case 'unary':
      return `${expr.operator}${emitExpression(expr.operand, 6)}`;
    case 'call':
      return `${expr.callee.join('.')}(${expr.args.map(arg => emitExpression(arg)).join(', ')})`;
    case 'binary': {
      const precedence = PRECEDENCE[expr.operator];
      const text = `${emitExpression(expr.left, precedence)} ${expr.operator} ${emitExpression(expr.right, precedence + 1)}`;
      return precedence < parentPrecedence ? `(${text})` : text;
    }
  }
}

const emitAssignment = (assignment: SflAssignment): string => `${assignment.target.join('.')} <- ${emitExpression(assignment.expr)}`;

// One assignment reads best on the line of the event; several go in a block.
export function emitHandler(handler: SflHandler, pad: string): string {
  if (handler.assignments.length === 1) {
    return `${pad}${handler.event}: ${emitAssignment(handler.assignments[0])}`;
  }
  const lines = handler.assignments.map(assignment => `${pad}  ${emitAssignment(assignment)}`);
  return [`${pad}${handler.event} {`, ...lines, `${pad}}`].join('\n');
}

export const emitBinding = (binding: SflBinding): string =>
  `${binding.key}: ${binding.operator} ${emitExpression(binding.expr)}`;
