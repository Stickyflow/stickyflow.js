import type { SflDocument } from './ast'
import { tokenize } from './lexer'
import { TokenCursor } from './parsing/cursor'
import { DocumentParser } from './parsing/document'

export { SflParseError } from './parsing/error'

export function parse(input: string): SflDocument {
  return new DocumentParser(new TokenCursor(tokenize(input))).parseDocument()
}
