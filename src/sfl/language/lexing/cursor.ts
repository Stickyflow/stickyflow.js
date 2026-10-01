export interface SourcePosition {
  line: number;
  col: number;
}

export class SourceCursor {
  private offset = 0;
  line = 1;
  col = 1;

  constructor(readonly input: string) {}

  get done(): boolean {
    return this.offset >= this.input.length;
  }

  peek(ahead = 0): string | undefined {
    return this.input[this.offset + ahead];
  }

  startsWith(value: string): boolean {
    return this.input.startsWith(value, this.offset);
  }

  position(): SourcePosition {
    return { line: this.line, col: this.col };
  }

  advance(): string {
    const character = this.input[this.offset];
    if (character === undefined) {
      throw new Error('Cannot advance beyond the end of the SFL source.');
    }
    this.offset++;
    if (character === '\n' || (character === '\r' && this.peek() !== '\n')) {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return character;
  }
}
