// SFL core — extracted (plan M1). Pure: no React, no DOM, no app aliases.
// Minimal surface used by the render pipeline; the app's editor/hooks/highlight
// helpers stay in the app and are not part of this package.
import { parse } from './parser';
import { emit } from './emitter';

export { parse, SflParseError } from './parser';
export { emit } from './emitter';
export { tokenize, SflLexError, type Token, type TokenType } from './lexer';
export * from './ast';
export {
  sflToCanvasState,
  type SflCanvasState, type SflEntityOut, type SflLinkOut, type SflGroupOut,
} from './sflToCanvasState';
export { sflToImportJson } from './adapters/sflToImportJson';
export { decodeColor, decodeShadow } from './adapters/decodeStyles';

/** Parse then canonically re-emit. Idempotent by design. */
export function canonicalize(sflText: string): string {
  return emit(parse(sflText));
}
