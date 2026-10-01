import type { SflDocument } from '../ast';
import { tokenizeSource } from '../lexing/tokenizer';
import { TokenCursor } from './cursor';
import { DocumentParser } from './document';

export function parseSource(input: string): SflDocument {
  return new DocumentParser(new TokenCursor(tokenizeSource(input))).parseDocument();
}
