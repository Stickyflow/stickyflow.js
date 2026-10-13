import { isNamedBlockKind, type SflBinding, type SflBlock, type SflEntry } from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { parseExpression } from './expressions';
import { PropertyParser } from './properties';

export class BlockParser {
  private readonly properties: PropertyParser;

  constructor(private readonly cursor: TokenCursor) {
    this.properties = new PropertyParser(cursor);
  }

  parseBlock(): SflBlock {
    const kind = this.cursor.expect('ident', 'block kind');
    if (!isNamedBlockKind(kind.value)) {
      throw new SflParseError(`unknown block kind '${kind.value}'`, kind.line, kind.col);
    }
    const name = this.cursor.expect('ident', 'block name');
    const composition = this.parseComposition();
    const entries = this.parseBlockEntries();
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

  private parseBlockEntries(): SflEntry[] {
    return this.parseEntries(() => this.parseBlockEntry());
  }

  private parseDataEntries(): SflEntry[] {
    return this.parseEntries(() => this.parseDataEntry());
  }

  private parseEntries(parseEntry: () => SflEntry): SflEntry[] {
    this.cursor.skipNewlines();
    this.cursor.expect('lbrace', "'{'");
    const entries: SflEntry[] = [];
    this.cursor.skipNewlines();
    while (!this.cursor.at('rbrace')) {
      if (this.cursor.at('eof')) {
        const token = this.cursor.peek();
        throw new SflParseError('unterminated block (missing "}")', token.line, token.col);
      }
      entries.push(parseEntry());
      if (this.cursor.at('semi')) {
        this.cursor.next();
      }
      this.cursor.skipNewlines();
    }
    this.cursor.expect('rbrace', "'}'");
    return entries;
  }

  private parseBlockEntry(): SflEntry {
    const token = this.cursor.peek();
    if (token.type !== 'ident') {
      throw new SflParseError(
        `expected property, block, layout, or style — got '${token.value || token.type}'`,
        token.line,
        token.col,
      );
    }
    if (isNamedBlockKind(token.value) && this.cursor.peek(1).type === 'ident') {
      return { type: 'block', block: this.parseBlock() };
    }
    if (token.value === 'layout' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'layout', layout: this.properties.parseLayout() };
    }
    if (token.value === 'style' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'style', style: this.properties.parseStyle() };
    }
    if (token.value === 'fields' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'fields', fields: this.properties.parseFields() };
    }
    if (['bind', 'bind2', 'action'].includes(this.cursor.peek(1).type)) {
      return { type: 'binding', binding: this.parseBinding() };
    }
    if (token.value === 'data' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'data', data: this.parseDataBlock() };
    }
    return { type: 'property', property: this.properties.parseProperty() };
  }

  private parseBinding(): SflBinding {
    const key = this.cursor.expect('ident', 'bound property');
    const operator = this.cursor.next().value as SflBinding['operator'];
    const expr = parseExpression(this.cursor);
    const next = this.cursor.peek();
    if (!['newline', 'semi', 'rbrace', 'eof'].includes(next.type)) {
      throw new SflParseError(`unexpected '${next.value || next.type}' after binding`, next.line, next.col);
    }
    return { key: key.value, operator, expr, line: key.line, col: key.col };
  }

  private parseDataEntry(): SflEntry {
    const token = this.cursor.peek();
    if (token.type === 'ident' && !isNamedBlockKind(token.value) && this.looksLikeSeriesEntry()) {
      return { type: 'block', block: this.parseSeriesEntry() };
    }
    return this.parseBlockEntry();
  }

  private parseDataBlock(): SflBlock {
    this.cursor.next();
    return { kind: 'data', name: '', composition: [], entries: this.parseDataEntries() };
  }

  private looksLikeSeriesEntry(): boolean {
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

  private parseSeriesEntry(): SflBlock {
    const name = this.cursor.expect('ident', 'series name');
    const composition = this.parseComposition();
    const entries = this.parseBlockEntries();
    return { kind: 'Series', name: name.value, composition, entries };
  }
}
