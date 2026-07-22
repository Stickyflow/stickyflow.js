// src/features/sfl-language/sfl/lexer.ts
//
// ─── Wozu dient der Lexer? (Stufe 1 von 4) ──────────────────────────────────
// Der Lexer (auch "Tokenizer") ist der erste Schritt. Er bekommt den SFL-Quelltext
// als EINE lange Zeichenkette und zerlegt sie in eine flache Liste bedeutungs-
// tragender "Wörter" — die Tokens: Bezeichner (`Entity`, `add_products`), Zahlen
// (`100`, `0.5`), Strings (`"…"`), Klammern (`{ } [ ]`), Doppelpunkt, Komma, Punkt
// und Zeilenumbruch.
//
// Warum braucht man das? Damit sich die nächste Stufe (der Parser) NICHT mit
// einzelnen Zeichen herumschlagen muss: Leerzeichen, `//`-Kommentare, Escape-
// Sequenzen (`\"`, `\n`), `"""`-Mehrzeiler, CRLF vs. LF — all das wird hier
// einmal sauber weggeräumt bzw. aufgelöst. Aus "Zeichensuppe" werden fertige
// Bausteine, mit denen sich Grammatik-Regeln überhaupt erst formulieren lassen.
//
// Besonderheit in unserem System: Zeilenumbrüche sind KEIN wegwerfbares
// Leerzeichen, sondern eigene Tokens — denn in SFL endet eine Property am
// Zeilenende (§4.1). Klammern dagegen sind whitespace-tolerant; der Parser
// überspringt Newline-Tokens dort, wo die Grammatik es erlaubt.
//
// Spec: §4 (lexikalische Struktur), §17 (Grammatik).

export type TokenType =
  | 'ident'
  | 'number'
  | 'string'
  | 'lbrace'    // {
  | 'rbrace'    // }
  | 'lbracket'  // [
  | 'rbracket'  // ]
  | 'lparen'    // ( — endpoint fraction, §10/§16
  | 'rparen'    // )
  | 'colon'     // :
  | 'comma'     // ,
  | 'semi'      // ; — alternative property separator, §5/§16
  | 'dot'       // .
  | 'amp'       // & (composition-list separator, §4/§16)
  | 'newline'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;        // raw lexeme (for ident/number); decoded text for strings
  numberValue?: number; // for number tokens
  multiline?: boolean;  // for string tokens ("""…""")
  line: number;         // 1-based
  col: number;          // 1-based
}

export class SflLexError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`SFL lex error (${line}:${col}): ${message}`);
    this.name = 'SflLexError';
  }
}

const isLetter = (ch: string) => /[A-Za-z_]/.test(ch);
const isDigit = (ch: string) => ch >= '0' && ch <= '9';
const isIdentPart = (ch: string) => /[A-Za-z0-9_]/.test(ch);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = input.length;

  const peek = (o = 0) => input[i + o];
  const push = (type: TokenType, value: string, extra: Partial<Token> = {}) =>
    tokens.push({ type, value, line, col, ...extra });

  const advance = (): string => {
    const ch = input[i++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  };

  while (i < n) {
    const ch = peek();

    // Newlines (normalize CRLF → one newline token)
    if (ch === '\r') {
      const startLine = line, startCol = col;
      advance();
      if (peek() === '\n') advance();
      tokens.push({ type: 'newline', value: '\n', line: startLine, col: startCol });
      continue;
    }
    if (ch === '\n') {
      const startLine = line, startCol = col;
      advance();
      tokens.push({ type: 'newline', value: '\n', line: startLine, col: startCol });
      continue;
    }

    // Horizontal whitespace
    if (ch === ' ' || ch === '\t') { advance(); continue; }

    // Line comments  // … (§4.2)
    if (ch === '/' && peek(1) === '/') {
      while (i < n && peek() !== '\n' && peek() !== '\r') advance();
      continue;
    }

    const startLine = line, startCol = col;

    // Single-char punctuation
    if (ch === '{') { advance(); tokens.push({ type: 'lbrace', value: '{', line: startLine, col: startCol }); continue; }
    if (ch === '}') { advance(); tokens.push({ type: 'rbrace', value: '}', line: startLine, col: startCol }); continue; }
    if (ch === '[') { advance(); tokens.push({ type: 'lbracket', value: '[', line: startLine, col: startCol }); continue; }
    if (ch === ']') { advance(); tokens.push({ type: 'rbracket', value: ']', line: startLine, col: startCol }); continue; }
    if (ch === '(') { advance(); tokens.push({ type: 'lparen', value: '(', line: startLine, col: startCol }); continue; }
    if (ch === ')') { advance(); tokens.push({ type: 'rparen', value: ')', line: startLine, col: startCol }); continue; }
    if (ch === ':') { advance(); tokens.push({ type: 'colon', value: ':', line: startLine, col: startCol }); continue; }
    if (ch === ',') { advance(); tokens.push({ type: 'comma', value: ',', line: startLine, col: startCol }); continue; }
    if (ch === ';') { advance(); tokens.push({ type: 'semi', value: ';', line: startLine, col: startCol }); continue; }
    if (ch === '&') { advance(); tokens.push({ type: 'amp', value: '&', line: startLine, col: startCol }); continue; }

    // Strings
    if (ch === '"') {
      const { value, multiline } = readString(input, () => ({ i, line, col }), (ni, nl, nc) => { i = ni; line = nl; col = nc; }, startLine, startCol);
      tokens.push({ type: 'string', value, multiline, line: startLine, col: startCol });
      continue;
    }

    // Numbers  [ - ] digit { digit } [ . digit { digit } ]  (§4.5)
    if (isDigit(ch) || (ch === '-' && isDigit(peek(1)!))) {
      let raw = '';
      if (ch === '-') raw += advance();
      while (i < n && isDigit(peek()!)) raw += advance();
      if (peek() === '.' && isDigit(peek(1)!)) {
        raw += advance(); // .
        while (i < n && isDigit(peek()!)) raw += advance();
      }
      tokens.push({ type: 'number', value: raw, numberValue: Number(raw), line: startLine, col: startCol });
      continue;
    }

    // Dot (path separator; number-decimals are consumed above, so a bare dot is a path dot)
    if (ch === '.') { advance(); tokens.push({ type: 'dot', value: '.', line: startLine, col: startCol }); continue; }

    // Identifiers  letter { letter | digit | _ }  (§4.3)
    if (isLetter(ch)) {
      let raw = '';
      while (i < n && isIdentPart(peek()!)) raw += advance();
      tokens.push({ type: 'ident', value: raw, line: startLine, col: startCol });
      continue;
    }

    throw new SflLexError(`unexpected character '${ch}'`, startLine, startCol);
  }

  tokens.push({ type: 'eof', value: '', line, col });
  return tokens;
}

// Reads a string literal starting at the opening quote. Handles both short
// ("…" with escapes) and long ("""…""" verbatim, trimming a single leading/
// trailing newline adjacent to the delimiters — §4.4). Uses getter/setter
// callbacks so it can advance the lexer's shared cursor.
function readString(
  input: string,
  _get: () => { i: number; line: number; col: number },
  set: (i: number, line: number, col: number) => void,
  startLine: number,
  startCol: number,
): { value: string; multiline: boolean } {
  let { i, line, col } = _get();
  const n = input.length;
  const adv = (): string => {
    const ch = input[i++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  };

  // Long string?  """
  if (input.slice(i, i + 3) === '"""') {
    adv(); adv(); adv(); // consume opening """
    let body = '';
    while (i < n) {
      if (input.slice(i, i + 3) === '"""') { adv(); adv(); adv(); break; }
      body += adv();
      if (i >= n) throw new SflLexError('unterminated long string', startLine, startCol);
    }
    // §4.4: Trim one leading newline directly after the opening delimiter and the
    // trailing newline + closing indentation before the closing delimiter.
    body = body.replace(/^\r?\n/, '').replace(/\r?\n[ \t]*$/, '');
    // trimIndent: remove the common leading whitespace shared by all non-blank
    // lines (the Emitter indents content to the property level; here we undo it,
    // so the stored value is clean and the round-trip is idempotent).
    body = dedent(body);
    set(i, line, col);
    return { value: body, multiline: true };
  }

  // Short string  "…"
  adv(); // opening "
  let out = '';
  while (i < n) {
    const ch = adv();
    if (ch === '"') { set(i, line, col); return { value: out, multiline: false }; }
    if (ch === '\n' || ch === '\r') throw new SflLexError('newline in short string (use """ for multiline)', startLine, startCol);
    if (ch === '\\') {
      const esc = adv();
      switch (esc) {
        case '"': out += '"'; break;
        case '\\': out += '\\'; break;
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        default: throw new SflLexError(`invalid escape '\\${esc}'`, startLine, startCol);
      }
      continue;
    }
    out += ch;
  }
  throw new SflLexError('unterminated string', startLine, startCol);
}

// Entfernt die gemeinsame führende Einrückung aller nicht-leeren Zeilen
// (Kotlin-`trimIndent`-Semantik). Leerzeilen zählen nicht für das Minimum und
// bleiben leer. Ist keine Zeile eingerückt, bleibt der Text unverändert.
function dedent(text: string): string {
  const lines = text.split('\n');
  let margin = Infinity;
  for (const l of lines) {
    if (l.trim().length === 0) continue; // Leerzeilen ignorieren
    const lead = l.match(/^[ \t]*/)![0].length;
    if (lead < margin) margin = lead;
  }
  if (!Number.isFinite(margin) || margin === 0) return text;
  return lines.map(l => (l.trim().length === 0 ? l : l.slice(margin))).join('\n');
}
