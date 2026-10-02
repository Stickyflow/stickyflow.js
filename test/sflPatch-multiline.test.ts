import { describe, expect, it } from 'vitest';
import { applyMoveChange, applyTextChange } from '../src/runtime/interaction/patchSfl';
import type { OwnerRef } from '../src/runtime/viewer';
import { parse } from '../src/sflLanguage';
import { sflToCanvasState } from '../src/sflSemantic/sflToCanvasState';

const owner = (id: string): OwnerRef => ({ role: 'entity', id });

const withBraceInMultiline = [
  'sfl 1.2',
  '',
  'Model M {',
  '  Shape a {',
  '    text: """',
  '      Schritt 1: oeffne {',
  '      Schritt 2: fertig',
  '    """',
  '    layout { position: 0, 0 }',
  '  }',
  '',
  '  Shape b {',
  '    text: "B"',
  '    layout { position: 100, 0 }',
  '  }',
  '}',
  '',
].join('\n');

const withHeaderLookalike = [
  'sfl 1.2',
  '',
  'Model M {',
  '  Shape a {',
  '    text: """',
  '      Shape b {',
  '    """',
  '    layout { position: 0, 0 }',
  '  }',
  '',
  '  Shape b {',
  '    layout { position: 100, 0 }',
  '  }',
  '}',
  '',
].join('\n');

describe('multiline strings in the patch scanner', () => {
  it('accepts a brace inside a multiline string as valid SFL', () => {
    expect(() => parse(withBraceInMultiline)).not.toThrow();
    const state = sflToCanvasState(withBraceInMultiline);
    expect(state.canvasObjects.map(e => e.id).sort()).toEqual(['a', 'b']);
  });

  it('moves the entity that owns the multiline string', () => {
    const next = applyMoveChange(withBraceInMultiline, { owner: owner('a'), dx: 25, dy: 5 });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'a')).toMatchObject({ x: 25, y: 5 });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'b')).toMatchObject({ x: 100, y: 0 });
  });

  it('leaves the multiline body untouched when moving its owner', () => {
    const next = applyMoveChange(withBraceInMultiline, { owner: owner('a'), dx: 25, dy: 5 });
    expect(next).toContain('Schritt 1: oeffne {');
    expect(next).toContain('Schritt 2: fertig');
  });

  it('moves an entity that follows a multiline string', () => {
    const next = applyMoveChange(withBraceInMultiline, { owner: owner('b'), dx: 40, dy: 10 });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'b')).toMatchObject({ x: 140, y: 10 });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  it('edits text of an entity that owns a multiline string', () => {
    const next = applyTextChange(withBraceInMultiline, { owner: owner('a'), text: 'kurz' });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'a')?.text).toBe('kurz');
  });

  it('does not treat a block header inside a string as a real block', () => {
    const next = applyMoveChange(withHeaderLookalike, { owner: owner('b'), dx: 10, dy: 10 });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'b')).toMatchObject({ x: 110, y: 10 });
    expect(next).toContain('      Shape b {');
  });
});
