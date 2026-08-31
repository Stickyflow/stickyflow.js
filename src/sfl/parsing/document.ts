import {
  isBlockKind,
  type SflBlock,
  type SflDocument,
  type SflEntry,
  type SflLayout,
  type SflProperty,
  type SflStyle,
} from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { parseEndpoint, parseValue } from './values';

export class DocumentParser {
  constructor(private readonly cursor: TokenCursor) {}

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
      blocks.push(this.parseBlock());
      this.cursor.skipNewlines();
    }
    return { version: version.value, blocks };
  }

  private parseBlock(): SflBlock {
    const kind = this.cursor.expect('ident', 'block kind');
    if (!isBlockKind(kind.value)) {
      throw new SflParseError(`unknown block kind '${kind.value}'`, kind.line, kind.col);
    }
    const name = this.cursor.expect('ident', 'block name');
    const composition = this.parseComposition();

    this.cursor.skipNewlines();
    this.cursor.expect('lbrace', "'{'");
    const entries: SflEntry[] = [];
    this.cursor.skipNewlines();
    while (!this.cursor.at('rbrace')) {
      if (this.cursor.at('eof')) {
        const token = this.cursor.peek();
        throw new SflParseError('unterminated block (missing "}")', token.line, token.col);
      }
      entries.push(this.parseEntry());
      if (this.cursor.at('semi')) this.cursor.next();
      this.cursor.skipNewlines();
    }
    this.cursor.expect('rbrace', "'}'");
    return { kind: kind.value, name: name.value, composition, entries };
  }

  private parseComposition(): string[] {
    if (!this.cursor.at('colon')) return [];
    this.cursor.next();
    const composition = [this.cursor.expect('ident', 'reference name after ":"').value];
    while (this.cursor.at('amp')) {
      this.cursor.next();
      composition.push(this.cursor.expect('ident', 'reference name after "&"').value);
    }
    return composition;
  }

  private parseEntry(): SflEntry {
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
      return { type: 'layout', layout: this.parseLayout() };
    }
    if (token.value === 'style' && this.cursor.peek(1).type === 'lbrace') {
      return { type: 'style', style: this.parseStyle() };
    }
    return { type: 'property', property: this.parseProperty() };
  }

  private parseLayout(): SflLayout {
    this.cursor.next();
    return { properties: this.parsePropertyBlock('layout') };
  }

  private parseStyle(): SflStyle {
    this.cursor.next();
    return { properties: this.parsePropertyBlock('style') };
  }

  private parsePropertyBlock(kind: 'layout' | 'style'): SflProperty[] {
    this.cursor.skipNewlines();
    this.cursor.expect('lbrace', "'{'");
    const properties: SflProperty[] = [];
    this.cursor.skipNewlines();
    while (!this.cursor.at('rbrace')) {
      if (this.cursor.at('eof')) {
        const token = this.cursor.peek();
        throw new SflParseError(`unterminated ${kind} block`, token.line, token.col);
      }
      properties.push(this.parseProperty());
      this.cursor.skipNewlines();
    }
    this.cursor.expect('rbrace', "'}'");
    return properties;
  }

  private parseProperty(): SflProperty {
    const key = this.cursor.expect('ident', 'property key').value;
    this.cursor.expect('colon', "':'");
    const value = key === 'from' || key === 'to' ? parseEndpoint(this.cursor) : parseValue(this.cursor);
    this.consumeTerminator();
    return { key, value };
  }

  private consumeTerminator(): void {
    if (this.cursor.at('newline') || this.cursor.at('semi')) {
      this.cursor.next();
      return;
    }
    if (this.cursor.at('rbrace') || this.cursor.at('eof')) return;
    const token = this.cursor.peek();
    throw new SflParseError(`unexpected '${token.value || token.type}' after property value`, token.line, token.col);
  }
}
