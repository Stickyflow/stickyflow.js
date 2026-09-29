import { isBlockKind, type SflBlock, type SflEntry } from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { PropertyParser } from './properties';

export class BlockParser {
  private readonly properties: PropertyParser;

  constructor(private readonly cursor: TokenCursor) {
    this.properties = new PropertyParser(cursor);
  }

  parseBlock(): SflBlock {
    const kind = this.cursor.expect('ident', 'block kind');
    if (!isBlockKind(kind.value)) {
      throw new SflParseError(`unknown block kind '${kind.value}'`, kind.line, kind.col);
    }
    const name = this.cursor.expect('ident', 'block name');
    const composition = this.parseComposition();
    const entries = this.parseEntries();
    return { kind: kind.value, name: name.value, composition, entries };
  }

  private parseComposition(): string[] {
    if (!this.cursor.at('colon')) {
      return [];
    }
    this.cursor.next();
    const composition = [this.cursor.expect('ident', 'reference name after ":"').value];
    while (this.cursor.at('amp')) {
      this.cursor.next();
      composition.push(this.cursor.expect('ident', 'reference name after "&"').value);
    }
    return composition;
  }

  private parseEntries(bareBlocksAreSeries = false): SflEntry[] {
    this.cursor.skipNewlines();
    this.cursor.expect('lbrace', "'{'");
    const entries: SflEntry[] = [];
    this.cursor.skipNewlines();
    while (!this.cursor.at('rbrace')) {
      if (this.cursor.at('eof')) {
        const token = this.cursor.peek();
        throw new SflParseError('unterminated block (missing "}")', token.line, token.col);
      }
      entries.push(this.parseEntry(bareBlocksAreSeries));
      if (this.cursor.at('semi')) {
        this.cursor.next();
      }
      this.cursor.skipNewlines();
    }
    this.cursor.expect('rbrace', "'}'");
    return entries;
  }

  private parseEntry(bareBlocksAreSeries: boolean): SflEntry {
    const token = this.cursor.peek();
    if (token.type !== 'ident') {
      throw new SflParseError(
        `expected property, block, layout, or style — got '${token.value || token.type}'`,
        token.line,
        token.col,
      );
    }
    if (isBlockKind(token.value) && this.cursor.peek(1).type === 'ident') {
      return { type: 'block', block: this.parseBlock() };
    }
    if (token.value === 'layout' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'layout', layout: this.properties.parseLayout() };
    }
    if (token.value === 'style' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'style', style: this.properties.parseStyle() };
    }
    if (token.value === 'data' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'data', data: this.parseDataBlock() };
    }
    if (bareBlocksAreSeries && !isBlockKind(token.value) && this.looksLikeBareSeries()) {
      return { type: 'block', block: this.parseBareSeries() };
    }
    return { type: 'property', property: this.properties.parseProperty() };
  }

  private parseDataBlock(): SflBlock {
    this.cursor.next();
    return { kind: 'data', name: '', composition: [], entries: this.parseEntries(true) };
  }

  private looksLikeBareSeries(): boolean {
    if (this.cursor.peek(1).type === 'lbrace') {
      return true;
    }
    if (this.cursor.peek(1).type !== 'colon') {
      return false;
    }
    let offset = 2;
    if (this.cursor.peek(offset).type !== 'ident') {
      return false;
    }
    offset++;
    while (this.cursor.peek(offset).type === 'amp') {
      offset++;
      if (this.cursor.peek(offset).type !== 'ident') {
        return false;
      }
      offset++;
    }
    return this.cursor.peek(offset).type === 'lbrace';
  }

  private parseBareSeries(): SflBlock {
    const name = this.cursor.expect('ident', 'series name');
    const composition = this.parseComposition();
    const entries = this.parseEntries();
    return { kind: 'Series', name: name.value, composition, entries };
  }
}
