import { emitDocument } from './emitting/document';
import { parseSource } from './parsing/parser';

export function canonicalizeSource(sflText: string): string {
  return emitDocument(parseSource(sflText));
}
