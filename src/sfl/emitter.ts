import type { SflDocument } from './ast';
import { emitDocument } from './language/emitting/document';

export function emit(document: SflDocument): string {
  return emitDocument(document);
}
