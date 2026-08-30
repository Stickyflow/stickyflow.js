// src/features/sfl-language/sfl/parser.ts
//
// ─── Wozu dient der Parser? (Stufe 2 von 4) ─────────────────────────────────
// Der Parser bekommt die flache Token-Liste vom Lexer und baut daraus die
// verschachtelte Baumstruktur (den AST — siehe ast.ts). Er kennt die Grammatik
// von SFL: "Ein Block hat einen Kopf (`Entity name : Style`), dann eine
// geschweifte Klammer, darin Properties, verschachtelte Blöcke und optional ein
// `layout`-Block." Aus einer Reihe von Bausteinen wird so eine echte Hierarchie:
// ein Flow enthält Groups, eine Group enthält Entities und Links usw.
//
// Warum braucht man das? Weil nur der Baum die BEDEUTUNG maschinell verarbeitbar
// macht. Die Token-Liste weiß nicht, dass "dieses Entity in jener Group steckt"
// oder dass ein Link ein `from` und ein `to` hat — der Parser stellt genau diese
// Beziehungen her. Nebenbei ist er die erste Instanz, die Syntaxfehler meldet
// (fehlende Klammer, unerwartetes Zeichen) — mit Zeilen-/Spaltenangabe.
//
// In unserem System ist der Parser die Eingangstür: Wenn die KI oder ein Import
// SFL-Text liefert, verwandelt der Parser ihn in Struktur, die wir anschließend
// in Canvas-Objekte übersetzen können.
//
// Zwei semantische Regeln stecken hier fest verdrahtet:
//   • `from`/`to` werden als Endpoints gelesen (Pfad [`,` Seite [`(`Bruch`)`]], §10/§16);
//     jeder andere Wert ist ein normaler Wert (Keyword/Pfad teilen `ident`, §6).
//   • `layout { … }` / `style { … }` sind eigene Sub-Blöcke, unterschieden von
//     einer gleichnamigen Property daran, ob `{` oder `:` folgt.
//
// Properties enden am Zeilenende ODER an einem `;` (§5) — beides ist ein
// gültiger Terminator, auch gemischt innerhalb desselben Blocks.
//
// Spec: §17 (Grammatik).

import {
  type SflDocument, type SflBlock, type SflEntry, type SflProperty,
  type SflLayout, type SflStyle, type SflValue, type SflValue as V,
  isBlockKind, isSide, type Side,
} from './ast';
import { tokenize, type Token, type TokenType } from './lexer';

export class SflParseError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`SFL parse error (${line}:${col}): ${message}`);
    this.name = 'SflParseError';
  }
}

export function parse(input: string): SflDocument {
  return new Parser(tokenize(input)).parseDocument();
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(o = 0): Token { return this.tokens[Math.min(this.pos + o, this.tokens.length - 1)]; }
  private at(type: TokenType): boolean { return this.peek().type === type; }
  private next(): Token { return this.tokens[this.pos++]; }

  private expect(type: TokenType, what: string): Token {
    const t = this.peek();
    if (t.type !== type) throw new SflParseError(`expected ${what}, got '${t.value || t.type}'`, t.line, t.col);
    return this.next();
  }

  /** Skip any run of NEWLINE tokens (whitespace around braces is free — §4.1). */
  private skipNewlines(): void { while (this.at('newline')) this.next(); }

  // ─── document = header , { block } ───────────────────────────────────────
  parseDocument(): SflDocument {
    this.skipNewlines();
    // header = "sfl" number newline
    const kw = this.expect('ident', "'sfl' header");
    if (kw.value !== 'sfl') throw new SflParseError(`document must start with 'sfl', got '${kw.value}'`, kw.line, kw.col);
    const ver = this.expect('number', 'version number');
    this.skipNewlines();

    const blocks: SflBlock[] = [];
    while (!this.at('eof')) {
      blocks.push(this.parseBlock());
      this.skipNewlines();
    }
    return { version: ver.value, blocks };
  }

  // ─── block = kind name [":" style] "{" { entry } "}" ─────────────────────
  private parseBlock(): SflBlock {
    const kindTok = this.expect('ident', 'block kind');
    if (!isBlockKind(kindTok.value)) {
      throw new SflParseError(`unknown block kind '${kindTok.value}'`, kindTok.line, kindTok.col);
    }
    const nameTok = this.expect('ident', 'block name');

    const composition: string[] = [];
    if (this.at('colon')) {
      this.next();
      composition.push(this.expect('ident', 'reference name after ":"').value);
      while (this.at('amp')) {
        this.next();
        composition.push(this.expect('ident', 'reference name after "&"').value);
      }
    }

    this.skipNewlines();
    this.expect('lbrace', "'{'");
    const entries: SflEntry[] = [];
    this.skipNewlines();
    while (!this.at('rbrace')) {
      if (this.at('eof')) throw new SflParseError('unterminated block (missing "}")', this.peek().line, this.peek().col);
      entries.push(this.parseEntry());
      // A property entry already ate its own terminator (consumeTerminator),
      // but a nested block/layout/style entry ends at its "}" with nothing
      // consumed after it — so a ";" separator was previously a parse error
      // there while being perfectly legal between two properties. Same
      // separator, same nesting level, two different answers; this makes the
      // block case agree with the property case. Matters for one-line SFL
      // (`Entity a { layout { … }; style { … } }`), which is the only style
      // that needs an explicit separator at all.
      if (this.at('semi')) this.next();
      this.skipNewlines();
    }
    this.expect('rbrace', "'}'");

    return { kind: kindTok.value, name: nameTok.value, composition, entries };
  }

  // ─── entry = property | block | layout-block | style-block ───────────────
  private parseEntry(): SflEntry {
    const t = this.peek();
    if (t.type !== 'ident') {
      throw new SflParseError(`expected property, block, layout, or style — got '${t.value || t.type}'`, t.line, t.col);
    }

    // Nested block: block-kind followed by a name identifier.
    if (isBlockKind(t.value) && this.peek(1).type === 'ident') {
      return { type: 'block', block: this.parseBlock() };
    }

    // layout-block: `layout {` (a property `layout:` is disambiguated by the ':')
    if (t.value === 'layout' && this.peek(1).type === 'lbrace') {
      return { type: 'layout', layout: this.parseLayout() };
    }

    // style-block: `style {` (a property `style:` is disambiguated by the ':')
    if (t.value === 'style' && this.peek(1).type === 'lbrace') {
      return { type: 'style', style: this.parseStyle() };
    }

    return { type: 'property', property: this.parseProperty() };
  }

  private parseLayout(): SflLayout {
    this.next(); // 'layout'
    this.skipNewlines();
    this.expect('lbrace', "'{'");
    const properties: SflProperty[] = [];
    this.skipNewlines();
    while (!this.at('rbrace')) {
      if (this.at('eof')) throw new SflParseError('unterminated layout block', this.peek().line, this.peek().col);
      properties.push(this.parseProperty());
      this.skipNewlines();
    }
    this.expect('rbrace', "'}'");
    return { properties };
  }

  private parseStyle(): SflStyle {
    this.next(); // 'style'
    this.skipNewlines();
    this.expect('lbrace', "'{'");
    const properties: SflProperty[] = [];
    this.skipNewlines();
    while (!this.at('rbrace')) {
      if (this.at('eof')) throw new SflParseError('unterminated style block', this.peek().line, this.peek().col);
      properties.push(this.parseProperty());
      this.skipNewlines();
    }
    this.expect('rbrace', "'}'");
    return { properties };
  }

  // ─── property = identifier ":" value newline ─────────────────────────────
  private parseProperty(): SflProperty {
    const key = this.expect('ident', 'property key').value;
    this.expect('colon', "':'");
    const value = (key === 'from' || key === 'to') ? this.parseEndpoint() : this.parseValue();
    this.consumeTerminator();
    return { key, value };
  }

  /** A property terminates at newline, ";", or the closing brace / EOF (§5). */
  private consumeTerminator(): void {
    if (this.at('newline')) { this.next(); return; }
    if (this.at('semi')) { this.next(); return; }
    if (this.at('rbrace') || this.at('eof')) return;
    const t = this.peek();
    throw new SflParseError(`unexpected '${t.value || t.type}' after property value`, t.line, t.col);
  }

  // ─── endpoint = path [ "," side [ "(" fraction ")" ] ]  (from/to only, §10/§16) ──
  private parseEndpoint(): SflValue {
    const segments = this.parsePathSegments();
    let side: Side | undefined;
    let fraction: number | undefined;
    if (this.at('comma')) {
      this.next(); // ','
      const sideTok = this.expect('ident', 'side after ","');
      if (!isSide(sideTok.value)) {
        throw new SflParseError(`expected a side (top/right/bottom/left), got '${sideTok.value}'`, sideTok.line, sideTok.col);
      }
      side = sideTok.value as Side;
      if (this.at('lparen')) {
        this.next(); // '('
        fraction = this.expect('number', 'fraction inside "("').numberValue;
        this.expect('rparen', "')'");
      }
    }
    return { type: 'endpoint', segments, side, fraction };
  }

  private parsePathSegments(): string[] {
    const segments = [this.expect('ident', 'path identifier').value];
    while (this.at('dot')) {
      this.next();
      segments.push(this.expect('ident', 'identifier after "."').value);
    }
    return segments;
  }

  // ─── value = string | list | tuple | number | path | keyword ─────────────
  // `allowTuple` ist nur auf Property-Ebene true. INNERHALB einer Liste ist ein
  // Komma stets ein Listen-Trenner, nie ein Tuple — sonst würde `[150, "x"]`
  // fälschlich als Tuple `150, "x"` gelesen.
  private parseValue(allowTuple = true): SflValue {
    const t = this.peek();
    switch (t.type) {
      case 'string':
        this.next();
        return { type: 'string', value: t.value, multiline: !!t.multiline };
      case 'lbracket':
        return this.parseList();
      case 'number': {
        this.next();
        // tuple = number "," number { "," number }  (nur auf Property-Ebene)
        if (allowTuple && this.at('comma')) {
          const values = [t.numberValue!];
          while (this.at('comma')) {
            this.next();
            values.push(this.expect('number', 'number in tuple').numberValue!);
          }
          return { type: 'tuple', values };
        }
        return { type: 'number', value: t.numberValue! };
      }
      case 'ident':
        return { type: 'ident', segments: this.parsePathSegments() };
      default:
        throw new SflParseError(`expected a value, got '${t.value || t.type}'`, t.line, t.col);
    }
  }

  private parseList(): SflValue {
    this.expect('lbracket', "'['");
    const values: V[] = [];
    this.skipNewlines();
    if (!this.at('rbracket')) {
      values.push(this.parseValue(false)); // in Listen keine Tuple-Erkennung
      this.skipNewlines();
      while (this.at('comma')) {
        this.next();
        this.skipNewlines();
        if (this.at('rbracket')) break; // tolerate trailing comma
        values.push(this.parseValue(false));
        this.skipNewlines();
      }
    }
    this.expect('rbracket', "']'");
    return { type: 'list', values };
  }
}
