import type { SourceCursor, SourcePosition } from './cursor';
import { createToken } from './tokenCreation';
import type { Token } from './types';

export function isLineBreak(character: string): boolean {
  return character === '\r' || character === '\n';
}

export function readLineBreak(cursor: SourceCursor, start: SourcePosition): Token {
  const firstCharacter = cursor.advance();
  if (firstCharacter === '\r' && cursor.peek() === '\n') {
    cursor.advance();
  }

  return createToken('newline', '\n', start);
}
