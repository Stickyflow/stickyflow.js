import type { SourceCursor } from './cursor';

export function startsLineComment(cursor: SourceCursor): boolean {
  return cursor.peek() === '/' && cursor.peek(1) === '/';
}

export function consumeLineComment(cursor: SourceCursor): void {
  while (!cursor.done && cursor.peek() !== '\n' && cursor.peek() !== '\r') {
    cursor.advance();
  }
}
