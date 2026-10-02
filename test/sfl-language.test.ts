import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  emit,
  isBlockKind,
  isNamedBlockKind,
  parse,
  SflLexError,
  SflParseError,
  tokenize,
} from '../src/sflLanguage';

const SOURCE = `sfl 1

Shape card {
  text: "Hello"
  layout { size: 160, 80; position: 20, 30 }
}
`;

describe('SFL language', () => {
  it('exposes the complete text-to-AST-to-text pipeline through one entry point', () => {
    const document = parse(SOURCE);

    expect(document.version).toBe('1');
    expect(document.blocks[0]).toMatchObject({ kind: 'Shape', name: 'card' });
    expect(emit(document)).toBe(canonicalize(SOURCE));
  });

  it('canonicalization is idempotent', () => {
    const canonical = canonicalize(SOURCE);

    expect(canonicalize(canonical)).toBe(canonical);
  });

  it('preserves composition syntax without resolving referenced definitions', () => {
    const source = `sfl 1

Layout placed { position: 20, 30 }
Style visible { fill: "#ffffff" }
Shape card : placed & visible {}
`;

    expect(canonicalize(source)).toContain('Shape card : placed & visible {');
  });

  it('does not discard repeated attached blocks while emitting', () => {
    const source = `sfl 1

Shape card {
  style { fill: "#ffffff" }
  style { stroke: "#000000" }
}
`;

    const canonical = canonicalize(source);
    expect(canonical.match(/style \{/g)).toHaveLength(2);
    expect(parse(canonical).blocks[0].entries.filter(entry => entry.type === 'style')).toHaveLength(2);
  });

  it('exposes tokens and syntax errors without semantic dependencies', () => {
    expect(tokenize('sfl 1').map(token => token.type)).toEqual(['ident', 'number', 'eof']);
    expect(() => tokenize('sfl 1 @')).toThrow(SflLexError);
    expect(() => parse('Shape card {}')).toThrow(SflParseError);
  });

  it('rejects unterminated empty multiline strings', () => {
    expect(() => tokenize('"""')).toThrow(SflLexError);
    expect(() => tokenize('"unfinished\\')).toThrow(SflLexError);
  });

  it('tracks lines consistently for every supported line ending', () => {
    expect(tokenize('first\rsecond')[2]).toMatchObject({ type: 'ident', value: 'second', line: 2, col: 1 });
    expect(tokenize('first\r\nsecond')[2]).toMatchObject({ type: 'ident', value: 'second', line: 2, col: 1 });
    expect(tokenize('first\nsecond')[2]).toMatchObject({ type: 'ident', value: 'second', line: 2, col: 1 });
  });

  it('distinguishes named blocks from the anonymous data block', () => {
    expect(isBlockKind('data')).toBe(true);
    expect(isNamedBlockKind('data')).toBe(false);
    expect(isNamedBlockKind('Series')).toBe(true);
  });

  it('accepts the legacy Entity block used by existing SFL documents', () => {
    const document = parse('sfl 1\nEntity item { kind: process }');

    expect(document.blocks[0]).toMatchObject({ kind: 'Entity', name: 'item' });
  });

  it('parses and emits Isometric blocks without semantic resolution', () => {
  const source = `sfl 1

Isometric relay {
  text: "Relay"
  layout {
    position: 320, 180
    size: 120, 130, 28
  }
  style {
    topFill: "#7c3aed"
    frontFill: "#5b21e8"
    sideFill: "#4c1dca"
  }
}
`;

  const document = parse(source);

  expect(document.blocks[0]).toMatchObject({
    kind: 'Isometric',
    name: 'relay',
  });
    const emitted = emit(document);
    expect(emit(parse(emitted))).toBe(emitted);
  });
});
