import { isIdentPart, isLetter } from './characters';
import type { SourceCursor, SourcePosition } from './cursor';
import { createToken } from './tokenCreation';
import type { Token } from './types';

export function startsIdentifier(cursor: SourceCursor): boolean {
  return isLetter(cursor.peek());
}

export function readIdentifier(cursor: SourceCursor, start: SourcePosition): Token {
  let value = '';
  while (isIdentPart(cursor.peek())) {
    value += cursor.advance();
  }

  return createToken('ident', value, start);
}
