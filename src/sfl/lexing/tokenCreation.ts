import type { SourceCursor, SourcePosition } from './cursor';
import type { Token, TokenType } from './types';

export function createToken(
  type: TokenType,
  value: string,
  start: SourcePosition,
  detail: Pick<Token, 'numberValue' | 'multiline'> = {},
): Token {
  return {
    type,
    value,
    line: start.line,
    col: start.col,
    endLine: start.line,
    endCol: start.col,
    ...detail,
  };
}

export function withTokenEnd(token: Token, cursor: SourceCursor): Token {
  return {
    ...token,
    endLine: cursor.line,
    endCol: cursor.col,
  };
}
