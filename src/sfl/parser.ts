import type { SflDocument } from './ast';
import { TokenCursor } from './language/parsing/cursor';
import { DocumentParser } from './language/parsing/document';
import { tokenize } from './lexer';

export { SflParseError } from './language/parsing/error';

export function parse(input: string): SflDocument {
  return new DocumentParser(new TokenCursor(tokenize(input))).parseDocument();
}
