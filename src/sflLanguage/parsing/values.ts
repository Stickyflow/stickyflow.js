import { isSide, type SflExpr, type SflValue, type Side } from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { parseExpression } from './expressions';

export function parsePathSegments(cursor: TokenCursor): string[] {
  const segments = [cursor.expect('ident', 'path identifier').value];
  while (cursor.at('dot')) {
    cursor.next();
    segments.push(cursor.expect('ident', 'identifier after "."').value);
  }
  return segments;
}

export function parseEndpoint(cursor: TokenCursor): SflValue {
  const segments = parsePathSegments(cursor);
  let side: Side | undefined;
  let fraction: number | undefined;

  if (cursor.at('comma')) {
    cursor.next();
    const sideToken = cursor.expect('ident', 'side after ","');
    if (!isSide(sideToken.value)) {
      throw new SflParseError(
        `expected a side (top/right/bottom/left), got '${sideToken.value}'`,
        sideToken.line,
        sideToken.col,
      );
    }
    side = sideToken.value;
    if (cursor.at('lparen')) {
      cursor.next();
      fraction = cursor.expectNumber('fraction inside "("');
      cursor.expect('rparen', "')'");
    }
  }
  return { type: 'endpoint', segments, side, fraction };
}

function parseList(cursor: TokenCursor): SflValue {
  cursor.expect('lbracket', "'['");
  const values: SflValue[] = [];
  cursor.skipNewlines();
  if (!cursor.at('rbracket')) {
    values.push(parseValue(cursor, false));
    cursor.skipNewlines();
    while (cursor.at('comma')) {
      cursor.next();
      cursor.skipNewlines();
      if (cursor.at('rbracket')) {
        break;
      }
      values.push(parseValue(cursor, false));
      cursor.skipNewlines();
    }
  }
  cursor.expect('rbracket', "']'");
  return { type: 'list', values };
}

const ARITHMETIC = new Set(['+', '-', '*', '/', '>', '<', '>=', '<=', '==', '!=', '&&', '||']);

// A value is computed when, before the end of the line, it has an operator or a call, or a name after a comma, or it starts with one.
// Nothing that was valid before has any of these, so the documents that are already written read as they did.
function startsComputed(cursor: TokenCursor): boolean {
  const first = cursor.peek();
  if (first.type === 'op' && first.value === '-') {
    return true;
  }
  if (first.type !== 'number' && first.type !== 'ident' && first.type !== 'lparen') {
    return false;
  }
  for (let offset = 0; ; offset++) {
    const token = cursor.peek(offset);
    if (token.type === 'newline' || token.type === 'semi' || token.type === 'rbrace' || token.type === 'eof') {
      return false;
    }
    if (token.type === 'lparen' || (token.type === 'op' && ARITHMETIC.has(token.value))) {
      return true;
    }
    if (token.type === 'ident' && cursor.peek(offset - 1).type === 'comma') {
      return true;
    }
    if (offset === 0 && token.type === 'ident' && cursor.peek(1).type === 'comma') {
      return true;
    }
  }
}

function parseComputed(cursor: TokenCursor): SflValue {
  const items: SflExpr[] = [parseExpression(cursor)];
  while (cursor.at('comma')) {
    cursor.next();
    items.push(parseExpression(cursor));
  }
  return { type: 'expr', items };
}

export function parseValue(cursor: TokenCursor, allowTuple = true): SflValue {
  if (allowTuple && startsComputed(cursor)) {
    return parseComputed(cursor);
  }
  const token = cursor.peek();
  switch (token.type) {
    case 'string':
      cursor.next();
      return { type: 'string', value: token.value };
    case 'lbracket':
      return parseList(cursor);
    case 'number': {
      const firstValue = cursor.expectNumber('number');
      if (!allowTuple || !cursor.at('comma')) {
        return { type: 'number', value: firstValue };
      }
      const values = [firstValue];
      while (cursor.at('comma')) {
        cursor.next();
        values.push(cursor.expectNumber('number in tuple'));
      }
      return { type: 'tuple', values };
    }
    case 'ident':
      return { type: 'ident', segments: parsePathSegments(cursor) };
    default:
      throw new SflParseError(`expected a value, got '${token.value || token.type}'`, token.line, token.col);
  }
}
