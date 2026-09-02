import { tokenizeSource } from './language/lexing/tokenizer';
import type { Token } from './language/lexing/types';

export { SflLexError } from './language/lexing/error';
export type { Token, TokenType } from './language/lexing/types';

export function tokenize(input: string): Token[] {
  return tokenizeSource(input);
}
