import { isDigit, isIdentPart, isLetter } from './characters';
import { SourceCursor, type SourcePosition } from './cursor';
import { SflLexError } from './error';
import { readString } from './strings';
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
  '&': 'amp',
};

function token(type: TokenType, value: string, start: SourcePosition, extra: Partial<Token> = {}): Token {
  return {
    type,
    value,
    line: start.line,
    col: start.col,
    endLine: start.line,
    endCol: start.col,
    ...extra,
  };
}

function readNumber(cursor: SourceCursor): Token {
  const start = cursor.position();
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
  return token('number', value, start, { numberValue: Number(value) });
}

function readIdentifier(cursor: SourceCursor): Token {
  const start = cursor.position();
  let value = '';
  while (isIdentPart(cursor.peek())) {
    value += cursor.advance();
  }
  return token('ident', value, start);
}

export function tokenizeSource(input: string): Token[] {
  const cursor = new SourceCursor(input);
  const tokens: Token[] = [];
  const push = (created: Token): void => {
    created.endLine = cursor.line;
    created.endCol = cursor.col;
    tokens.push(created);
  };

  while (!cursor.done) {
    const character = cursor.peek();
    if (character === undefined) {
      break;
    }
    const start = cursor.position();

    if (character === '\r' || character === '\n') {
      cursor.advance();
      if (character === '\r' && cursor.peek() === '\n') {
        cursor.advance();
      }
      push(token('newline', '\n', start));
      continue;
    }
    if (character === ' ' || character === '\t') {
      cursor.advance();
      continue;
    }
    if (character === '/' && cursor.peek(1) === '/') {
      while (!cursor.done && cursor.peek() !== '\n' && cursor.peek() !== '\r') {
        cursor.advance();
      }
      continue;
    }

    const punctuation = PUNCTUATION[character];
    if (punctuation) {
      cursor.advance();
      push(token(punctuation, character, start));
      continue;
    }
    if (character === '"') {
      const string = readString(cursor, start);
      push(token('string', string.value, start, { multiline: string.multiline }));
      continue;
    }
    if (isDigit(character) || (character === '-' && isDigit(cursor.peek(1)))) {
      push(readNumber(cursor));
      continue;
    }
    if (character === '.') {
      cursor.advance();
      push(token('dot', '.', start));
      continue;
    }
    if (isLetter(character)) {
      push(readIdentifier(cursor));
      continue;
    }
    throw new SflLexError(`unexpected character '${character}'`, start.line, start.col);
  }

  push(token('eof', '', cursor.position()));
  return tokens;
}
