import { emit } from './emitter';
import { parse } from './parser';

export { decodeColor, decodeShadow } from './adapters/decodeStyles';
export { sflToImportJson } from './adapters/sflToImportJson';
export * from './ast';
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

export function canonicalize(sflText: string): string {
  return emit(parse(sflText));
}
