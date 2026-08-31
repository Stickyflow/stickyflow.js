import type { SourceCursor, SourcePosition } from './cursor';
import { SflLexError } from './error';

function dedent(text: string): string {
  const lines = text.split('\n');
  let margin = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    margin = Math.min(margin, line.match(/^[ \t]*/)![0].length);
  }
  if (!Number.isFinite(margin) || margin === 0) return text;
  return lines.map(line => (line.trim() ? line.slice(margin) : line)).join('\n');
}

function readLongString(cursor: SourceCursor, start: SourcePosition): string {
  cursor.advance();
  cursor.advance();
  cursor.advance();
  let body = '';

  while (!cursor.done) {
    if (cursor.startsWith('"""')) {
      cursor.advance();
      cursor.advance();
      cursor.advance();
      break;
    }
    body += cursor.advance();
    if (cursor.done) {
      throw new SflLexError('unterminated long string', start.line, start.col);
    }
  }

  return dedent(body.replace(/^\r?\n/, '').replace(/\r?\n[ \t]*$/, ''));
}

function readShortString(cursor: SourceCursor, start: SourcePosition): string {
  cursor.advance();
  let value = '';
  while (!cursor.done) {
    const character = cursor.advance();
    if (character === '"') return value;
    if (character === '\n' || character === '\r') {
      throw new SflLexError('newline in short string (use """ for multiline)', start.line, start.col);
    }
    if (character !== '\\') {
      value += character;
      continue;
    }

    const escaped = cursor.advance();
    if (escaped === '"') value += '"';
    else if (escaped === '\\') value += '\\';
    else if (escaped === 'n') value += '\n';
    else if (escaped === 't') value += '\t';
    else throw new SflLexError(`invalid escape '\\${escaped}'`, start.line, start.col);
  }
  throw new SflLexError('unterminated string', start.line, start.col);
}

export function readString(cursor: SourceCursor, start: SourcePosition): { value: string; multiline: boolean } {
  const multiline = cursor.startsWith('"""');
  const value = multiline ? readLongString(cursor, start) : readShortString(cursor, start);
  return { value, multiline };
}
