export type TokenType =
  | 'ident'
  | 'number'
  | 'string'
  | 'lbrace'
  | 'rbrace'
  | 'lbracket'
  | 'rbracket'
  | 'lparen'
  | 'rparen'
  | 'colon'
  | 'comma'
  | 'semi'
  | 'dot'
  | 'amp'
  | 'bind'
  | 'bind2'
  | 'action'
  | 'op'
  | 'newline'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  numberValue?: number;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
}
