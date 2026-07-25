import { describe, expect, it } from 'vitest';
import { applyTextChange, applyMoveChange, applyResizeChange } from '../src/interaction/patchSfl';
import { sflToCanvasState } from '../src/sfl';
import type { OwnerRef } from '../src/viewer';

const owner = (id: string, role: OwnerRef['role'] = 'entity'): OwnerRef => ({ role, id });

describe('applyTextChange', () => {
  it('replaces an existing text value', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a {\n    text: "Old"\n    layout { position: 0, 0 }\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'New' });
    expect(next).toContain('text: "New"');
    expect(next).not.toContain('text: "Old"');
  });

  it('inserts text when the owner has none yet (e.g. an unlabeled link)', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a { layout { position: 0, 0 } }\n  Entity b { layout { position: 100, 0 } }\n  Link l {\n    from: a, right (0.5)\n    to: b, left (0.5)\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('l', 'link'), text: 'creates' });
    expect(next).toContain('text: "creates"');
    expect(next).toMatch(/Link l \{\n\s*text: "creates"/);
  });

  it('escapes quotes and backslashes in the new value', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a {\n    text: "Old"\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'She said "hi" \\ bye' });
    expect(next).toContain('text: "She said \\"hi\\" \\\\ bye"');
  });

  it('is a no-op for an unknown owner id', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a { text: "Old" }\n}\n`;
    expect(applyTextChange(sfl, { owner: owner('missing'), text: 'New' })).toBe(sfl);
  });

  it('leaves unrelated blocks, comments and formatting untouched', () => {
    const sfl = `sfl 1.2\n\n// board comment\nModel M {\n  // a's own comment\n  Entity a {\n    text: "Old"\n  }\n\n  Entity b {\n    text: "Keep me"\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'New' });
    expect(next).toContain('// board comment');
    expect(next).toContain("// a's own comment");
    expect(next).toContain('text: "Keep me"');
  });
});

describe('applyMoveChange', () => {
  it('adds the delta to an existing local layout { position }', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a {\n    layout {\n      position: 100, 50\n      size: 80, 40\n    }\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 10, dy: -5 });
    expect(next).toContain('position: 110, 45');
    expect(next).toContain('size: 80, 40'); // untouched sibling property
  });

  it('inserts a local layout { position } when the entity has none', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a {\n    text: "A"\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 5, dy: 5 });
    expect(next).toContain('layout {');
    expect(next).toContain('position: 5, 5');
  });

  it('resolves the current position through a composed Layout reference, not just a local block', () => {
    const sfl = `sfl 1.2\n\nLayout Card {\n  position: 200, 100\n  size: 120, 60\n}\n\nModel M {\n  Entity a : Card {\n    text: "A"\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 10, dy: 20 });
    // The shared Layout block itself must stay untouched...
    expect(next).toContain('position: 200, 100');
    // ...while the entity gets its own local override at the resolved+delta position.
    const entity = sflToCanvasState(next).entities.find(e => e.id === 'a');
    expect(entity?.x).toBe(210);
    expect(entity?.y).toBe(120);
  });

  it("does not confuse a Container's own layout with a nested child entity's", () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Container f {\n    kind: frame\n    text: "F"\n    Entity inner {\n      layout { position: 5, 5 }\n    }\n    layout {\n      position: 0, 0\n      size: 300, 200\n    }\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('f'), dx: 10, dy: 10 });
    expect(next).toContain('position: 10, 10'); // the frame's own
    expect(next).toContain('position: 5, 5'); // inner entity's, untouched
  });

  it('is a no-op for an unknown owner id', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a { layout { position: 0, 0 } }\n}\n`;
    expect(applyMoveChange(sfl, { owner: owner('missing'), dx: 1, dy: 1 })).toBe(sfl);
  });
});

describe('applyResizeChange', () => {
  const event = { owner: owner('a'), dx: 0, dy: 0, dWidth: 20, dHeight: 10, x: 0, y: 0, width: 120, height: 60 };

  it('sets absolute position and size in an existing local layout block', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a {\n    layout {\n      position: 0, 0\n      size: 100, 50\n      rotation: 15\n    }\n  }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('position: 0, 0');
    expect(next).toContain('size: 120, 60');
    expect(next).toContain('rotation: 15'); // untouched sibling property
  });

  it('inserts a local layout block with both properties when the entity has none', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a {\n    text: "A"\n  }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('position: 0, 0');
    expect(next).toContain('size: 120, 60');
  });

  it('is a no-op for an unknown owner id', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Entity a { layout { position: 0, 0 } }\n}\n`;
    expect(applyResizeChange(sfl, { ...event, owner: owner('missing') })).toBe(sfl);
  });
});
