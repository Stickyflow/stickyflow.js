import type { SourceCursor, SourcePosition } from './cursor';
import { createToken } from './tokenCreation';
import type { Token, TokenType } from './types';

const PUNCTUATION: Partial<Record<string, TokenType>> = {
  '{': 'lbrace',
  '}': 'rbrace',
  '[': 'lbracket',
  ']': 'rbracket',
  '(': 'lparen',
  ')': 'rparen',
  ':': 'colon',
  ',': 'comma',
  ';': 'semi',
  '.': 'dot',
  '&': 'amp',
};

export function readPunctuation(cursor: SourceCursor, start: SourcePosition): Token | null {
  const character = cursor.peek();
  const type = character ? PUNCTUATION[character] : undefined;
  // '&&' is the logical operator; a single '&' joins names in a composition.
  if (!character || !type || (character === '&' && cursor.peek(1) === '&')) {
    return null;
  }

  cursor.advance();
  return createToken(type, character, start);
}
