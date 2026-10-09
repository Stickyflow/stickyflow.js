import { describe, expect, it } from 'vitest';
import {
  applyLinkReconnectChange,
  applyMoveChange,
  applyResizeChange,
  applyTextChange,
  insertCanvasObject,
  insertLink,
  removeCanvasObject,
  removeLink,
} from '../src/runtime/interaction/patchSfl';
import type { OwnerRef } from '../src/runtime/viewer';
import { parse } from '../src/sflLanguage';
import { sflToCanvasState } from '../src/sflSemantic/sflToCanvasState';

const owner = (id: string, role: OwnerRef['role'] = 'shape'): OwnerRef => ({ role, id });

describe('applyTextChange', () => {
  it('replaces an existing text value', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    text: "Old"\n    layout { position: 0, 0 }\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'New' });
    expect(next).toContain('text: "New"');
    expect(next).not.toContain('text: "Old"');
  });

  it('inserts text when the owner has none yet (e.g. an unlabeled link)', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n  Shape b { layout { position: 100, 0 } }\n  Link l {\n    from: a, right (0.5)\n    to: b, left (0.5)\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('l', 'link'), text: 'creates' });
    expect(next).toContain('text: "creates"');
    expect(next).toMatch(/Link l \{\n\s*text: "creates"/);
  });

  it('escapes quotes and backslashes in the new value', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    text: "Old"\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'She said "hi" \\ bye' });
    expect(next).toContain('text: "She said \\"hi\\" \\\\ bye"');
  });

  it('is a no-op for an unknown owner id', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { text: "Old" }\n}\n`;
    expect(applyTextChange(sfl, { owner: owner('missing'), text: 'New' })).toBe(sfl);
  });

  it('leaves unrelated blocks, comments and formatting untouched', () => {
    const sfl = `sfl 1.2\n\n// board comment\nModel M {\n  // a's own comment\n  Shape a {\n    text: "Old"\n  }\n\n  Shape b {\n    text: "Keep me"\n  }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'New' });
    expect(next).toContain('// board comment');
    expect(next).toContain("// a's own comment");
    expect(next).toContain('text: "Keep me"');
  });

  it('replaces text in place on a single-line entity, without duplicating it as a stray sibling line', () => {
    // Regression: findDirectProperty used to match only `^\s*key\s*:`, which
    // can never be true for a property packed onto a compact one-line block —
    // every apply*Change call "found" nothing and fell through to its insert
    // path, which for a single-line owner spliced the new line in as a
    // SIBLING of the block (past its closing brace) rather than replacing
    // anything. The real property was silently never touched again.
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { text: "Old"; layout { position: 0, 0 } }\n}\n`;
    const next = applyTextChange(sfl, { owner: owner('a'), text: 'New' });
    expect(next).toContain('text: "New"');
    expect(next).not.toContain('text: "Old"');
    expect(next.match(/text:/g)?.length).toBe(1);
  });
});

describe('applyMoveChange', () => {
  it('adds the delta to an existing local layout { position }', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    layout {\n      position: 100, 50\n      size: 80, 40\n    }\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 10, dy: -5 });
    expect(next).toContain('position: 110, 45');
    expect(next).toContain('size: 80, 40'); // untouched sibling property
  });

  it('inserts a local layout { position } when the entity has none', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    text: "A"\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 5, dy: 5 });
    expect(next).toContain('layout {');
    expect(next).toContain('position: 5, 5');
  });

  it('resolves the current position through a composed Layout reference, not just a local block', () => {
    const sfl = `sfl 1.2\n\nLayout Card {\n  position: 200, 100\n  size: 120, 60\n}\n\nModel M {\n  Shape a : Card {\n    text: "A"\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 10, dy: 20 });
    // The shared Layout block itself must stay untouched...
    expect(next).toContain('position: 200, 100');
    // ...while the entity gets its own local override at the resolved+delta position.
    const entity = sflToCanvasState(next).canvasObjects.find(e => e.id === 'a');
    expect(entity?.x).toBe(210);
    expect(entity?.y).toBe(120);
  });

  it("does not confuse a Container's own layout with a nested child entity's", () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Container f {\n    kind: frame\n    text: "F"\n    Shape inner {\n      layout { position: 5, 5 }\n    }\n    layout {\n      position: 0, 0\n      size: 300, 200\n    }\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('f'), dx: 10, dy: 10 });
    expect(next).toContain('position: 10, 10'); // the frame's own
    expect(next).toContain('position: 5, 5'); // inner entity's, untouched
  });

  it('is a no-op for an unknown owner id', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n}\n`;
    expect(applyMoveChange(sfl, { owner: owner('missing'), dx: 1, dy: 1 })).toBe(sfl);
  });

  it('writes a parent-relative position for a child moved inside a Container away from the canvas origin', () => {
    // Regression: entity.x/entity.y from sflToCanvasState are ABSOLUTE
    // (the container's own origin already folded in), but layout.position is
    // relative to the immediate parent. Writing the absolute value straight
    // back double-counts the container's offset on the next render, sending
    // the child far outside it. Every prior test here has its container at
    // the canvas origin, where absolute and relative coincide and this bug
    // is invisible - this one deliberately doesn't.
    const sfl = `sfl 1.2\n\nModel M {\n  Container f {\n    kind: frame\n    text: "F"\n    layout { position: -200, -900; size: 1000, 250 }\n    Entity inner {\n      layout { position: 490, 140; size: 220, 60 }\n    }\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('inner'), dx: 0, dy: 30 });
    // Parent-relative position moves by the same delta as the absolute drag...
    expect(next).toContain('position: 490, 170');
    // ...and the container's own layout is untouched.
    expect(next).toContain('position: -200, -900');
    // The child's resolved absolute position actually reflects the drag.
    const entity = sflToCanvasState(next).canvasObjects.find(e => e.id === 'inner');
    expect(entity?.x).toBe(290); // -200 + 490, unchanged (no horizontal drag)
    expect(entity?.y).toBe(-730); // -900 + 170, i.e. the pre-drag -760 shifted by +30
  });

  it('updates position in place on a single-line layout block, without duplicating it as a stray sibling line', () => {
    // Regression (see applyTextChange's matching test for the full mechanism):
    // a compact `layout { position: 80, 80; size: 200, 80 }` is routine LLM
    // output (fewer tokens) and valid SFL either way — this used to make
    // every move on such an entity silently insert a dead duplicate `position:`
    // line beside the real one instead of updating it, so the entity never
    // actually moved on commit (it only looked like it had, until the
    // viewer's next re-render snapped it back to the untouched original).
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    text: "A"\n    layout { position: 80, 80; size: 200, 80 }\n  }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 20, dy: 20 });
    expect(next).toContain('layout { position: 100, 100; size: 200, 80 }');
    expect(next.match(/position:/g)?.length).toBe(1);
    // Applying a second move on the already-patched document must keep
    // replacing in place, not just work once by accident.
    const again = applyMoveChange(next, { owner: owner('a'), dx: 5, dy: -5 });
    expect(again).toContain('layout { position: 105, 95; size: 200, 80 }');
    expect(again.match(/position:/g)?.length).toBe(1);
  });

  it("updates position in place when the layout block shares its OWN physical line with the entity's opening brace too", () => {
    // Same regression as applyResizeChange's matching test, hit via a plain
    // drag instead of a resize handle: `Shape a : Style { text: "A"; layout
    // { position: 80, 80; size: 200, 80 } }` all on one line - what an LLM
    // asked to write compact SFL for a whole diagram routinely produces for
    // EVERY entity, not just one. Dropping the shape used to silently revert
    // to its pre-drag position because the patched document no longer parsed.
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { text: "A"; layout { position: 80, 80; size: 200, 80 } }\n}\n`;
    const next = applyMoveChange(sfl, { owner: owner('a'), dx: 20, dy: 20 });
    expect(next).toContain('layout { position: 100, 100; size: 200, 80 }');
    expect(next.match(/position:/g)?.length).toBe(1);
    expect(() => parse(next)).not.toThrow();
  });
});

describe('applyResizeChange', () => {
  const event = { owner: owner('a'), dx: 0, dy: 0, dWidth: 20, dHeight: 10, x: 0, y: 0, width: 120, height: 60 };

  it('sets absolute position and size in an existing local layout block', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    layout {\n      position: 0, 0\n      size: 100, 50\n      rotation: 15\n    }\n  }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('position: 0, 0');
    expect(next).toContain('size: 120, 60');
    expect(next).toContain('rotation: 15'); // untouched sibling property
  });

  it('inserts a local layout block with both properties when the entity has none', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    text: "A"\n  }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('position: 0, 0');
    expect(next).toContain('size: 120, 60');
  });

  it('is a no-op for an unknown owner id', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n}\n`;
    expect(applyResizeChange(sfl, { ...event, owner: owner('missing') })).toBe(sfl);
  });

  it('writes a parent-relative position for a child resized inside a Container away from the canvas origin', () => {
    // Same absolute-vs-relative bug as applyMoveChange's matching test:
    // event.x/event.y are the resize gesture's absolute bounds.
    const sfl = `sfl 1.2\n\nModel M {\n  Container f {\n    kind: frame\n    text: "F"\n    layout { position: -200, -900; size: 1000, 250 }\n    Entity inner {\n      layout { position: 490, 140; size: 220, 60 }\n    }\n  }\n}\n`;
    // Absolute bounds after the resize: top-left moved from (290, -760) to (300, -750).
    const next = applyResizeChange(sfl, { ...event, owner: owner('inner'), x: 300, y: -750, width: 240, height: 70 });
    expect(next).toContain('position: 500, 150'); // 300 - (-200), -750 - (-900)
    expect(next).toContain('size: 240, 70');
    expect(next).toContain('position: -200, -900'); // container's own layout untouched
  });

  it('sets position and size in place on a single-line layout block, without duplicating either as a stray sibling line', () => {
    // The entity itself spans multiple lines with `layout {}` as its own
    // (single-line) child — the structure real SFL actually has, including
    // every fixture in this file and everything an LLM has produced in
    // practice.
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    text: "A"\n    layout { position: 0, 0; size: 100, 50 }\n  }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('layout { position: 0, 0; size: 120, 60 }');
    expect(next.match(/position:/g)?.length).toBe(1);
    expect(next.match(/size:/g)?.length).toBe(1);
  });

  it("sets position and size in place when the layout block shares its OWN physical line with the entity's opening brace too", () => {
    // Regression: `Shape a { text: "A"; layout { position: 0, 0; size: 100,
    // 50 } }` all on one line - routine LLM output optimizing for fewer
    // tokens, and valid SFL either way. findChildBlock's header search is
    // per LINE, so it could never see a child header starting mid-line; the
    // old insert-fallback then spliced a stray, unparseable `layout {}` in
    // as a sibling PAST the entity's own closing brace, breaking the whole
    // document. A drag/resize on a document shaped like this used to look
    // like it worked and then silently snap back on the next re-render, once
    // the app's caller rejected the now-invalid SFL and reverted.
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { text: "A"; layout { position: 0, 0; size: 100, 50 } }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('layout { position: 0, 0; size: 120, 60 }');
    expect(next.match(/position:/g)?.length).toBe(1);
    expect(next.match(/size:/g)?.length).toBe(1);
    expect(() => parse(next)).not.toThrow();
  });

  it('inserts a brand-new layout block inline when the entity itself is single-line and has no layout at all', () => {
    const sfl = `sfl 1.2\n\nModel M {\n  Shape a { text: "A" }\n}\n`;
    const next = applyResizeChange(sfl, event);
    expect(next).toContain('layout { position: 0, 0; size: 120, 60 }');
    expect(next).not.toMatch(/\n\s*layout\s*\{/); // stayed inline, not spliced as a new sibling line
    expect(() => parse(next)).not.toThrow();
  });
});

describe('applyLinkReconnectChange', () => {
  const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n  Shape b { layout { position: 100, 0 } }\n  Shape c { layout { position: 200, 0 } }\n  Link l {\n    from: a, right (0.5)\n    to: b, left (0.5)\n    text: "creates"\n  }\n}\n`;

  it('reconnects the `to` end to a different entity, side, and fraction', () => {
    const event = {
      owner: owner('l', 'link'),
      end: 'to' as const,
      target: owner('c'),
      side: 'top' as const,
      fraction: 0.25,
    };
    const next = applyLinkReconnectChange(sfl, event);
    expect(next).toContain('to: c, top (0.25)');
    expect(next).toContain('from: a, right (0.5)'); // untouched
    expect(next).toContain('text: "creates"'); // untouched sibling property
  });

  it('reconnects the `from` end to a different spot on the SAME entity', () => {
    const event = {
      owner: owner('l', 'link'),
      end: 'from' as const,
      target: owner('a'),
      side: 'bottom' as const,
      fraction: 0.8,
    };
    const next = applyLinkReconnectChange(sfl, event);
    expect(next).toContain('from: a, bottom (0.8)');
    expect(next).toContain('to: b, left (0.5)'); // untouched
  });

  it('rounds the fraction to two decimal places', () => {
    const event = {
      owner: owner('l', 'link'),
      end: 'to' as const,
      target: owner('c'),
      side: 'left' as const,
      fraction: 0.123456,
    };
    const next = applyLinkReconnectChange(sfl, event);
    expect(next).toContain('to: c, left (0.12)');
  });

  it('is a no-op for an unknown owner id', () => {
    const event = {
      owner: owner('missing', 'link'),
      end: 'to' as const,
      target: owner('c'),
      side: 'top' as const,
      fraction: 0.5,
    };
    expect(applyLinkReconnectChange(sfl, event)).toBe(sfl);
  });

  it('reconnects in place on a single-line Link block, without duplicating the endpoint as a stray sibling line', () => {
    // Regression: this was the more visibly broken half of the bug — the
    // insert-fallback for a single-line Link (`Link l { from: a; to: b }`,
    // the compact form an LLM routinely writes) spliced the new `to:` in as
    // a MODEL-level sibling line, past the link's own closing brace. The SFL
    // still parsed (a stray top-level property is silently ignored, not an
    // error) with two `to:` values effectively present for the same link —
    // exactly the "two endpoints, contradiction" shape a reader (human or an
    // LLM asked to comment on the document) would flag on sight.
    const compact = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n  Shape b { layout { position: 100, 0 } }\n  Shape c { layout { position: 200, 0 } }\n  Link l { from: a, right (0.5); to: b, left (0.5) }\n}\n`;
    const event = {
      owner: owner('l', 'link'),
      end: 'to' as const,
      target: owner('c'),
      side: 'top' as const,
      fraction: 0.25,
    };
    const next = applyLinkReconnectChange(compact, event);
    expect(next).toContain('Link l { from: a, right (0.5); to: c, top (0.25) }');
    expect(next.match(/\bto:/g)?.length).toBe(1);
  });
});

describe('insertCanvasObject', () => {
  const sfl = `sfl 1.2\n\nModel M {\n  Shape a {\n    layout { position: 0, 0; size: 100, 60 }\n  }\n  Container f {\n    kind: frame\n    text: "F"\n    layout { position: 200, 200; size: 400, 300 }\n  }\n}\n`;

  it('appends a new shape as an Shape block at the end of the Model', () => {
    const next = insertCanvasObject(sfl, { id: 'b', kind: 'shape', text: 'B', x: 300, y: 0, width: 120, height: 60 });
    expect(() => parse(next)).not.toThrow();
    const entity = sflToCanvasState(next).canvasObjects.find(e => e.id === 'b');
    expect(entity?.objectType).toBe('shape');
    expect(entity?.text).toBe('B');
    expect([entity?.x, entity?.y, entity?.width, entity?.height]).toEqual([300, 0, 120, 60]);
    // The existing entities are untouched, still present, in their original form.
    expect(next).toContain('Shape a {');
    expect(next).toContain('Container f {');
  });

  it('escapes a multi-line label instead of emitting a literal newline', () => {
    // Real bug: quick-duplicating a shape whose label had two lines ("Kai
    // Havertz\nST · drops deep" — the model writes these constantly) produced
    // a raw line break inside a short "…" string, which the lexer rejects
    // outright. The patch then silently failed while the caller had already
    // adopted the unparseable text. Tabs and quotes ride along the same path.
    const label = 'Kai Havertz\nST · drops "deep"\tfast';
    const next = insertCanvasObject(sfl, { id: 'b', kind: 'shape', text: label, x: 300, y: 0, width: 120, height: 60 });
    expect(() => parse(next)).not.toThrow();
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'b')?.text).toBe(label);
    // The emitted line carries escapes, not an actual break.
    expect(next).toContain('text: "Kai Havertz\\nST · drops \\"deep\\"\\tfast"');
  });

  it('round-trips a multi-line label through a rename', () => {
    const renamed = applyTextChange(sfl, { owner: owner('a'), text: 'line one\nline two' });
    expect(() => parse(renamed)).not.toThrow();
    expect(sflToCanvasState(renamed).canvasObjects.find(e => e.id === 'a')?.text).toBe('line one\nline two');
  });

  it('writes `kind: frame`/`kind: swimlane` for a Container', () => {
    const withFrame = insertCanvasObject(sfl, { id: 'g', kind: 'frame', x: 0, y: 500, width: 200, height: 100 });
    expect(sflToCanvasState(withFrame).canvasObjects.find(e => e.id === 'g')?.objectType).toBe('frame');

    const withSwimlane = insertCanvasObject(sfl, { id: 'p', kind: 'swimlane', x: 0, y: 500, width: 200, height: 100 });
    expect(sflToCanvasState(withSwimlane).canvasObjects.find(e => e.id === 'p')?.objectType).toBe('swimlane');
  });

  it('nests inside parentId with a frame-relative position, given absolute x/y', () => {
    const next = insertCanvasObject(sfl, {
      id: 'child',
      kind: 'shape',
      x: 210,
      y: 210,
      width: 50,
      height: 50,
      parentId: 'f',
    });
    expect(next).toMatch(/Container f \{[\s\S]*Shape child \{[\s\S]*position: 10, 10[\s\S]*\}[\s\S]*\}/);
    const child = sflToCanvasState(next).canvasObjects.find(e => e.id === 'child');
    expect(child?.parentFrameId).toBe('f'); // resolved back to the same absolute position
    expect([child?.x, child?.y]).toEqual([210, 210]);
  });

  it('injects `body` verbatim, indented, as extra lines in the new block', () => {
    const next = insertCanvasObject(sfl, {
      id: 'styled',
      kind: 'shape',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      body: 'style {\n  shape: pill\n  fill: "#fff"\n}',
    });
    expect(next).toContain('shape: pill');
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'styled')?.shapeType).toBe('pill');
  });

  it('is a no-op when the id already exists, is invalid, or the parentId is unknown', () => {
    expect(insertCanvasObject(sfl, { id: 'a', kind: 'shape', x: 0, y: 0, width: 1, height: 1 })).toBe(sfl);
    expect(insertCanvasObject(sfl, { id: 'has space', kind: 'shape', x: 0, y: 0, width: 1, height: 1 })).toBe(sfl);
    expect(
      insertCanvasObject(sfl, { id: 'new', kind: 'shape', x: 0, y: 0, width: 1, height: 1, parentId: 'missing' }),
    ).toBe(sfl);
  });
});

describe('removeCanvasObject', () => {
  const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n  Shape b { layout { position: 100, 0 } }\n  Shape c { layout { position: 200, 0 } }\n  Link l1 {\n    from: a\n    to: b\n  }\n  Link l2 {\n    from: b\n    to: c\n  }\n}\n`;

  it('removes the entity block', () => {
    const next = removeCanvasObject(sfl, 'b', { alsoRemoveLinks: false });
    expect(next).not.toContain('Shape b {');
    expect(next).toContain('Shape a {');
    expect(next).toContain('Shape c {');
  });

  it('by default also removes links that reference the removed entity', () => {
    const next = removeCanvasObject(sfl, 'b');
    expect(next).not.toContain('Shape b {');
    expect(next).not.toContain('Link l1 {'); // referenced b via to:
    expect(next).not.toContain('Link l2 {'); // referenced b via from:
    expect(() => parse(next)).not.toThrow();
  });

  it('leaves links dangling when alsoRemoveLinks is false', () => {
    const next = removeCanvasObject(sfl, 'b', { alsoRemoveLinks: false });
    expect(next).toContain('Link l1 {');
    expect(next).toContain('Link l2 {');
  });

  it('does not corrupt the document when a referenced link is nested INSIDE the removed entity', () => {
    const nested = `sfl 1.2\n\nModel M {\n  Container f {\n    kind: frame\n    text: "F"\n    Shape x { layout { position: 10, 10 } }\n    Shape y { layout { position: 50, 10 } }\n    Link inner {\n      from: x\n      to: y\n    }\n    layout { position: 0, 0; size: 300, 200 }\n  }\n  Shape outside { layout { position: 500, 0 } }\n}\n`;
    const next = removeCanvasObject(nested, 'f');
    expect(next).not.toContain('Container f {');
    expect(next).not.toContain('Link inner {');
    expect(next).toContain('Shape outside {'); // untouched, well past the removed range
    expect(() => parse(next)).not.toThrow();
  });

  it('is a no-op for an unknown id', () => {
    expect(removeCanvasObject(sfl, 'missing')).toBe(sfl);
  });
});

describe('insertLink', () => {
  const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n  Shape b { layout { position: 100, 0 } }\n}\n`;

  it('appends a new Link with sides and fractions', () => {
    const next = insertLink(sfl, {
      id: 'l1',
      fromId: 'a',
      toId: 'b',
      fromSide: 'right',
      fromFraction: 0.5,
      toSide: 'left',
      toFraction: 0.25,
      text: 'go',
    });
    expect(() => parse(next)).not.toThrow();
    const link = sflToCanvasState(next).links.find(l => l.id === 'l1');
    expect(link?.fromId).toBe('a');
    expect(link?.toId).toBe('b');
    expect(link?.fromSide).toBe('right');
    expect(link?.toFraction).toBe(0.25);
    expect(link?.text).toBe('go');
  });

  it('writes a bare from/to (no side) when none is given', () => {
    const next = insertLink(sfl, { id: 'l1', fromId: 'a', toId: 'b' });
    expect(next).toMatch(/from: a\s*$/m);
    expect(next).toMatch(/to: b\s*$/m);
  });

  it('is a no-op when the id already exists or an endpoint entity does not', () => {
    const withL1 = insertLink(sfl, { id: 'l1', fromId: 'a', toId: 'b' });
    expect(insertLink(withL1, { id: 'l1', fromId: 'a', toId: 'b' })).toBe(withL1);
    expect(insertLink(sfl, { id: 'l2', fromId: 'a', toId: 'missing' })).toBe(sfl);
    expect(insertLink(sfl, { id: 'l2', fromId: 'missing', toId: 'b' })).toBe(sfl);
  });
});

describe('removeLink', () => {
  const sfl = `sfl 1.2\n\nModel M {\n  Shape a { layout { position: 0, 0 } }\n  Shape b { layout { position: 100, 0 } }\n  Link l1 {\n    from: a\n    to: b\n  }\n}\n`;

  it('removes the link block, leaving its entities untouched', () => {
    const next = removeLink(sfl, 'l1');
    expect(next).not.toContain('Link l1 {');
    expect(next).toContain('Shape a {');
    expect(next).toContain('Shape b {');
  });

  it('is a no-op for an unknown id', () => {
    expect(removeLink(sfl, 'missing')).toBe(sfl);
  });
});
