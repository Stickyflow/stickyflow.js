import type { SflBlock, SflDocument } from '../ast';
import { BlockParser } from './blocks';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';

export class DocumentParser {
  private readonly blocks: BlockParser;

  constructor(private readonly cursor: TokenCursor) {
    this.blocks = new BlockParser(cursor);
  }

  parseDocument(): SflDocument {
    this.cursor.skipNewlines();
    const header = this.cursor.expect('ident', "'sfl' header");
    if (header.value !== 'sfl') {
      throw new SflParseError(`document must start with 'sfl', got '${header.value}'`, header.line, header.col);
    }
    const version = this.cursor.expect('number', 'version number');
    this.cursor.skipNewlines();

    const blocks: SflBlock[] = [];
    while (!this.cursor.at('eof')) {
      blocks.push(this.blocks.parseBlock());
      this.cursor.skipNewlines();
    }
    return { version: version.value, blocks };
  }
}
