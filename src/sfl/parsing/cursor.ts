import type { Token, TokenType } from '../lexer'
import { SflParseError } from './error'

export class TokenCursor {
  private position = 0

  constructor(private readonly tokens: Token[]) {}

  peek(offset = 0): Token {
    return this.tokens[Math.min(this.position + offset, this.tokens.length - 1)]
  }

  at(type: TokenType): boolean {
    return this.peek().type === type
  }

  next(): Token {
    return this.tokens[this.position++]
  }

  expect(type: TokenType, description: string): Token {
    const token = this.peek()
    if (token.type !== type) {
      throw new SflParseError(
        `expected ${description}, got '${token.value || token.type}'`,
        token.line,
        token.col,
      )
    }
    return this.next()
  }

  skipNewlines(): void {
    while (this.at('newline')) this.next()
  }
}
