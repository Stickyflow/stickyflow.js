import { SourceCursor } from './cursor';
import { readNextToken } from './nextToken';
import { createToken, withTokenEnd } from './tokenCreation';
import type { Token } from './types';

export function tokenizeSource(input: string): Token[] {
  const cursor = new SourceCursor(input);
  const tokens: Token[] = [];

  while (!cursor.done) {
    const token = readNextToken(cursor);
    if (token) {
      tokens.push(withTokenEnd(token, cursor));
    }
  }

  tokens.push(withTokenEnd(createToken('eof', '', cursor.position()), cursor));
  return tokens;
}
