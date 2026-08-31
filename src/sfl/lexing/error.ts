export class SflLexError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`SFL lex error (${line}:${col}): ${message}`)
    this.name = 'SflLexError'
  }
}
