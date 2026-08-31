import type { SflDocument } from './ast'
import { emitDocument } from './emitting/document'

export function emit(document: SflDocument): string {
  return emitDocument(document)
}
