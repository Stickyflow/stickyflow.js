import { isDigit } from './characters';
import type { SourceCursor, SourcePosition } from './cursor';
import { createToken } from './tokenCreation';
import type { Token } from './types';

export function startsNumber(cursor: SourceCursor): boolean {
  const character = cursor.peek();
  return isDigit(character) || (character === '-' && isDigit(cursor.peek(1)));
}

export function readNumber(cursor: SourceCursor, start: SourcePosition): Token {
  let value = '';
  if (cursor.peek() === '-') {
    value += cursor.advance();
  }
  while (isDigit(cursor.peek())) {
    value += cursor.advance();
  }
  if (cursor.peek() === '.' && isDigit(cursor.peek(1))) {
    value += cursor.advance();
    while (isDigit(cursor.peek())) {
      value += cursor.advance();
    }
  }

  return createToken('number', value, start, { numberValue: Number(value) });
}
