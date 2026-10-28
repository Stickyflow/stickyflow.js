import type { ExpressionOperator, SflAssignment, SflBinding, SflExpr, SflHandler } from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { parsePathSegments } from './pathSegments';

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

const OR = new Set(['||']);
const AND = new Set(['&&']);
const ADDITIVE = new Set(['+', '-']);
const MULTIPLICATIVE = new Set(['*', '/']);

export function parseExpression(cursor: TokenCursor): SflExpr {
  return parseBinaryLevel(cursor, OR, parseAnd);
}

function parseAnd(cursor: TokenCursor): SflExpr {
  return parseBinaryLevel(cursor, AND, parseComparison);
}

function parseComparison(cursor: TokenCursor): SflExpr {
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
      if (path.length === 1 && (path[0] === 'true' || path[0] === 'false')) {
        return { kind: 'boolean', value: path[0] === 'true' };
      }
      return cursor.at('lparen')
        ? { kind: 'call', callee: path, args: parseCallArguments(cursor) }
        : { kind: 'ref', path };
    }
    default:
      throw new SflParseError(`expected an expression, got '${token.value || token.type}'`, token.line, token.col);
  }
}

export const BINDING_OPERATORS = ['bind', 'bind2', 'action'];

export function atBinding(cursor: TokenCursor): boolean {
  return (
    cursor.peek().type === 'ident' && cursor.peek(1).type === 'colon' && BINDING_OPERATORS.includes(cursor.peek(2).type)
  );
}

export function parseBinding(cursor: TokenCursor): SflBinding {
  const key = cursor.expect('ident', 'bound property');
  cursor.expect('colon', "':'");
  const operator = cursor.next().value as SflBinding['operator'];
  const expr = parseExpression(cursor);
  const next = cursor.peek();
  if (!['newline', 'semi', 'rbrace', 'eof'].includes(next.type)) {
    throw new SflParseError(`unexpected '${next.value || next.type}' after binding`, next.line, next.col);
  }
  return { key: key.value, operator, expr, line: key.line, col: key.col };
}

export function parseAssignment(cursor: TokenCursor): SflAssignment {
  const start = cursor.peek();
  const target = parsePathSegments(cursor);
  cursor.expect('bind', "'<-'");
  const expr = parseExpression(cursor);
  return { target, expr, line: start.line, col: start.col };
}

export function atHandler(cursor: TokenCursor): boolean {
  const token = cursor.peek();
  return token.type === 'ident' && /^on[A-Z]/.test(token.value) && ['colon', 'lbrace'].includes(cursor.peek(1).type);
}

export function parseHandler(cursor: TokenCursor): SflHandler {
  const event = cursor.expect('ident', 'event name');
  const assignments: SflAssignment[] = [];
  if (cursor.at('colon')) {
    cursor.next();
    assignments.push(parseAssignment(cursor));
    expectEnd(cursor, 'handler');
  } else {
    cursor.expect('lbrace', "'{'");
    cursor.skipNewlines();
    while (!cursor.at('rbrace')) {
      if (cursor.at('eof')) {
        throw new SflParseError(`unterminated handler '${event.value}'`, event.line, event.col);
      }
      assignments.push(parseAssignment(cursor));
      expectEnd(cursor, 'assignment');
      cursor.skipNewlines();
    }
    cursor.expect('rbrace', "'}'");
  }
  return { event: event.value, assignments, line: event.line, col: event.col };
}

function expectEnd(cursor: TokenCursor, what: string): void {
  const next = cursor.peek();
  if (!['newline', 'semi', 'rbrace', 'eof'].includes(next.type)) {
    throw new SflParseError(`unexpected '${next.value || next.type}' after ${what}`, next.line, next.col);
  }
  if (next.type === 'semi') {
    cursor.next();
  }
}
