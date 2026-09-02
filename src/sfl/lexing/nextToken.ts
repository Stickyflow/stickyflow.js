import type { SourceCursor } from './cursor';
import { SflLexError } from './error';
import { readIdentifier, startsIdentifier } from './identifiers';
import { isLineBreak, readLineBreak } from './lineBreak';
import { consumeLineComment, startsLineComment } from './lineComment';
import { readNumber, startsNumber } from './numbers';
import { readPunctuation } from './punctuation';
import { consumeSpacing, isSpacing } from './spacing';
import { readStringToken } from './stringToken';
import type { Token } from './types';

export function readNextToken(cursor: SourceCursor): Token | null {
  const character = cursor.peek();
  if (character === undefined) {
    return null;
  }

  const start = cursor.position();
  if (isLineBreak(character)) {
    return readLineBreak(cursor, start);
  }
  if (isSpacing(character)) {
    consumeSpacing(cursor);
    return null;
  }
  if (startsLineComment(cursor)) {
    consumeLineComment(cursor);
    return null;
  }

  const punctuation = readPunctuation(cursor, start);
  if (punctuation) {
    return punctuation;
  }
  if (character === '"') {
    return readStringToken(cursor, start);
  }
  if (startsNumber(cursor)) {
    return readNumber(cursor, start);
  }
  if (startsIdentifier(cursor)) {
    return readIdentifier(cursor, start);
  }

  throw new SflLexError(`unexpected character '${character}'`, start.line, start.col);
}
