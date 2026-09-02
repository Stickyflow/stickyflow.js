import { emit } from './emitter';
import { parse } from './parser';

export * from './ast';
export { decodeColor, decodeShadow } from './decodeStyles';
export { emit } from './emitter';
export { SflLexError, type Token, type TokenType, tokenize } from './lexer';
export { parse, SflParseError } from './parser';
export {
  type SflCanvasState,
  type SflEntityOut,
  type SflGroupOut,
  type SflLinkOut,
  sflToCanvasState,
} from './sflToCanvasState';
export { type SflImportJson, sflToImportJson } from './sflToImportJson';

export function canonicalize(sflText: string): string {
  return emit(parse(sflText));
}
