import type { SflLayout, SflProperty, SflStyle } from '../ast';
import type { TokenCursor } from './cursor';
import { SflParseError } from './error';
import { parseEndpoint, parseValue } from './values';

export class PropertyParser {
  constructor(private readonly cursor: TokenCursor) {}

  parseLayout(): SflLayout {
    this.cursor.next();
    return { properties: this.parsePropertyBlock('layout') };
  }

  parseStyle(): SflStyle {
    this.cursor.next();
    return { properties: this.parsePropertyBlock('style') };
  }

  parseFields(): SflProperty[] {
    this.cursor.next();
    return this.parsePropertyBlock('fields');
  }

  parseProperty(): SflProperty {
    const key = this.cursor.expect('ident', 'property key').value;
    this.cursor.expect('colon', "':'");
    const value = key === 'from' || key === 'to' ? parseEndpoint(this.cursor) : parseValue(this.cursor);
    this.consumeTerminator();
    return { key, value };
  }

  private parsePropertyBlock(kind: 'layout' | 'style' | 'fields'): SflProperty[] {
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

  private consumeTerminator(): void {
    if (this.cursor.at('newline') || this.cursor.at('semi')) {
      this.cursor.next();
      return;
    }
    if (this.cursor.at('rbrace') || this.cursor.at('eof')) {
      return;
    }
    const token = this.cursor.peek();
    throw new SflParseError(`unexpected '${token.value || token.type}' after property value`, token.line, token.col);
  }
}
