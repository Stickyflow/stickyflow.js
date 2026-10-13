import type { SourceCursor, SourcePosition } from './cursor';
import { SflLexError } from './error';
import { readIdentifier, startsIdentifier } from './identifiers';
import { isLineBreak, readLineBreak } from './lineBreak';
import { consumeLineComment, startsLineComment } from './lineComment';
import { readNumber, startsNumber } from './numbers';
import { readOperator } from './operators';
import { readPunctuation } from './punctuation';
import { consumeSpacing, isSpacing } from './spacing';
import { readStringToken } from './strings';
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
  if (consumeLexerTrivia(cursor, character)) {
    return null;
  }
  const token = readSymbolToken(cursor, character, start) ?? readWordToken(cursor, start);
  if (token) {
    return token;
  }

  throw new SflLexError(`unexpected character '${character}'`, start.line, start.col);
}

function consumeLexerTrivia(cursor: SourceCursor, character: string): boolean {
  if (isSpacing(character)) {
    consumeSpacing(cursor);
    return true;
  }
  if (startsLineComment(cursor)) {
    consumeLineComment(cursor);
    return true;
  }
  return false;
}

function readSymbolToken(cursor: SourceCursor, character: string, start: SourcePosition): Token | null {
  const punctuation = readPunctuation(cursor, start);
  if (punctuation) {
    return punctuation;
  }
  if (character === '"') {
    return readStringToken(cursor, start);
  }
  return readOperator(cursor, start);
}

function readWordToken(cursor: SourceCursor, start: SourcePosition): Token | null {
  if (startsNumber(cursor)) {
    return readNumber(cursor, start);
  }
  if (startsIdentifier(cursor)) {
    return readIdentifier(cursor, start);
  }
  return null;
}
