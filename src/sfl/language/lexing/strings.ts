import type { SourceCursor, SourcePosition } from './cursor';
import { SflLexError } from './error';

function indentationWidth(line: string): number {
  let width = 0;
  while (line[width] === ' ' || line[width] === '\t') {
    width++;
  }
  return width;
}

function dedent(text: string): string {
  const lines = text.split('\n');
  let margin = Infinity;
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    margin = Math.min(margin, indentationWidth(line));
  }
  if (!Number.isFinite(margin) || margin === 0) {
    return text;
  }
  return lines.map(line => (line.trim() ? line.slice(margin) : line)).join('\n');
}

function readLongString(cursor: SourceCursor, start: SourcePosition): string {
  consumeLongStringDelimiter(cursor);
  let body = '';

  while (!cursor.done) {
    if (cursor.startsWith('"""')) {
      consumeLongStringDelimiter(cursor);
      break;
    }
    body += cursor.advance();
    if (cursor.done) {
      throw new SflLexError('unterminated long string', start.line, start.col);
    }
  }

  return dedent(body.replace(/^\r?\n/, '').replace(/\r?\n[ \t]*$/, ''));
}

function consumeLongStringDelimiter(cursor: SourceCursor): void {
  cursor.advance();
  cursor.advance();
  cursor.advance();
}

function readShortString(cursor: SourceCursor, start: SourcePosition): string {
  cursor.advance();
  let value = '';
  while (!cursor.done) {
    const character = cursor.advance();
    if (character === '"') {
      return value;
    }
    if (character === '\n' || character === '\r') {
      throw new SflLexError('newline in short string (use """ for multiline)', start.line, start.col);
    }
    value += character === '\\' ? readEscapedCharacter(cursor, start) : character;
  }
  throw new SflLexError('unterminated string', start.line, start.col);
}

function readEscapedCharacter(cursor: SourceCursor, start: SourcePosition): string {
  const escaped = cursor.advance();
  switch (escaped) {
    case '"':
      return '"';
    case '\\':
      return '\\';
    case 'n':
      return '\n';
    case 't':
      return '\t';
    default:
      throw new SflLexError(`invalid escape '\\${escaped}'`, start.line, start.col);
  }
}

export function readString(cursor: SourceCursor, start: SourcePosition): { value: string; multiline: boolean } {
  const multiline = cursor.startsWith('"""');
  const value = multiline ? readLongString(cursor, start) : readShortString(cursor, start);
  return { value, multiline };
}
