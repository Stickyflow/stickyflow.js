import type { ExpressionOperator, SflExpr } from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { parsePathSegments } from './values';

const COMPARISONS = new Set(['>', '<', '>=', '<=', '==', '!=']);

function atOperator(cursor: TokenCursor, operators: ReadonlySet<string>): boolean {
  const token = cursor.peek();
  return token.type === 'op' && operators.has(token.value);
}

function parseBinaryLevel(
  cursor: TokenCursor,
  operators: ReadonlySet<string>,
  parseOperand: (cursor: TokenCursor) => SflExpr,
): SflExpr {
  let left = parseOperand(cursor);
  while (atOperator(cursor, operators)) {
    const operator = cursor.next().value as ExpressionOperator;
    left = { kind: 'binary', operator, left, right: parseOperand(cursor) };
  }
  return left;
}

const ADDITIVE = new Set(['+', '-']);
const MULTIPLICATIVE = new Set(['*', '/']);

export function parseExpression(cursor: TokenCursor): SflExpr {
  return parseBinaryLevel(cursor, COMPARISONS, parseAdditive);
}

function parseAdditive(cursor: TokenCursor): SflExpr {
  return parseBinaryLevel(cursor, ADDITIVE, parseMultiplicative);
}

function parseMultiplicative(cursor: TokenCursor): SflExpr {
  return parseBinaryLevel(cursor, MULTIPLICATIVE, parseUnary);
}

function parseUnary(cursor: TokenCursor): SflExpr {
  const token = cursor.peek();
  if (token.type === 'op' && (token.value === '!' || token.value === '-')) {
    cursor.next();
    return { kind: 'unary', operator: token.value, operand: parseUnary(cursor) };
  }
  return parsePrimary(cursor);
}

function parseCallArguments(cursor: TokenCursor): SflExpr[] {
  cursor.expect('lparen', "'('");
  const args: SflExpr[] = [];
  cursor.skipNewlines();
  while (!cursor.at('rparen')) {
    args.push(parseExpression(cursor));
    cursor.skipNewlines();
    if (cursor.at('comma')) {
      cursor.next();
      cursor.skipNewlines();
    } else if (!cursor.at('rparen')) {
      const token = cursor.peek();
      throw new SflParseError(`expected ',' or ')', got '${token.value || token.type}'`, token.line, token.col);
    }
  }
  cursor.expect('rparen', "')'");
  return args;
}

function parsePrimary(cursor: TokenCursor): SflExpr {
  const token = cursor.peek();
  switch (token.type) {
    case 'number':
      return { kind: 'number', value: cursor.expectNumber('number') };
    case 'string':
      cursor.next();
      return { kind: 'string', value: token.value };
    case 'lparen': {
      cursor.next();
      const inner = parseExpression(cursor);
      cursor.expect('rparen', "')'");
      return inner;
    }
    case 'ident': {
      const path = parsePathSegments(cursor);
      return cursor.at('lparen') ? { kind: 'call', callee: path, args: parseCallArguments(cursor) } : { kind: 'ref', path };
    }
    default:
      throw new SflParseError(`expected an expression, got '${token.value || token.type}'`, token.line, token.col);
  }
}
