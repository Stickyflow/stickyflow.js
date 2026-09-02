import { tokenizeSource } from './lexing/tokenizer';
import type { Token } from './lexing/types';

export { SflLexError } from './lexing/error';
export type { Token, TokenType } from './lexing/types';

export function tokenize(input: string): Token[] {
  return tokenizeSource(input);
}
