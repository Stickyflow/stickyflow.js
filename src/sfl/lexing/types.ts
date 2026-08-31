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
  | 'newline'
  | 'eof'

export interface Token {
  type: TokenType
  value: string
  numberValue?: number
  multiline?: boolean
  line: number
  col: number
}
