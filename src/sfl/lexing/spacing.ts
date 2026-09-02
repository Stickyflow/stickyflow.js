import type { SourceCursor } from './cursor';

export function isSpacing(character: string): boolean {
  return character === ' ' || character === '\t';
}

export function consumeSpacing(cursor: SourceCursor): void {
  cursor.advance();
}
