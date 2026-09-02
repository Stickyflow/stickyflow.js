import type { SourceCursor, SourcePosition } from './cursor';
import { readString } from './strings';
import { createToken } from './tokenCreation';
import type { Token } from './types';

export function readStringToken(cursor: SourceCursor, start: SourcePosition): Token {
  const string = readString(cursor, start);
  return createToken('string', string.value, start, { multiline: string.multiline });
}
