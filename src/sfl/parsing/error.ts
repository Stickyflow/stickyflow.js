export class SflParseError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`SFL parse error (${line}:${col}): ${message}`)
    this.name = 'SflParseError'
  }
}
