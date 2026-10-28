import type { TokenCursor } from './cursor';

// A name of one or more segments joined by dots, as `data.price`.
export function parsePathSegments(cursor: TokenCursor): string[] {
  const segments = [cursor.expect('ident', 'path identifier').value];
  while (cursor.at('dot')) {
    cursor.next();
    segments.push(cursor.expect('ident', 'identifier after "."').value);
  }
  return segments;
}
