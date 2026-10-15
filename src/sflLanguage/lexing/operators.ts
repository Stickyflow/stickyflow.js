import type { SourceCursor, SourcePosition } from './cursor';
import { createToken } from './tokenCreation';
import type { Token, TokenType } from './types';

const OPERATORS: Array<[string, TokenType]> = [
  ['<->', 'bind2'],
  ['<-', 'bind'],
  ['->', 'action'],
  ['&&', 'op'],
  ['||', 'op'],
  ['>=', 'op'],
  ['<=', 'op'],
  ['==', 'op'],
  ['!=', 'op'],
  ['+', 'op'],
  ['-', 'op'],
  ['*', 'op'],
  ['/', 'op'],
  ['>', 'op'],
  ['<', 'op'],
  ['!', 'op'],
];

const startsNumber = (character: string | undefined): boolean => character !== undefined && /[\d.]/.test(character);

export function readOperator(cursor: SourceCursor, start: SourcePosition): Token | null {
  const match = OPERATORS.find(([text]) => cursor.startsWith(text));
  if (!match) {
    return null;
  }
  const [text, type] = match;
  if (text === '-' && startsNumber(cursor.peek(1))) {
    return null;
  }
  for (let index = 0; index < text.length; index++) {
    cursor.advance();
  }
  return createToken(type, text, start);
}
