import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';
import { applyPathPointChange, insertPath } from '../src/runtime/interaction/patchSfl';
import type { OwnerRef } from '../src/runtime/viewer';

const owner = (id: string): OwnerRef => ({ role: 'path', id });

describe('applyPathPointChange', () => {
  it('rewrites a top-level path’s points to the new absolute coordinates', () => {
    const sfl = `sfl 1.4\n\nModel M {\n  Path p {\n    points: [[10, 10], [50, 10], [50, 50]]\n  }\n}\n`;
    const next = applyPathPointChange(sfl, {
      owner: owner('p'),
      points: [
        { x: 10, y: 10 },
        { x: 80, y: 20 },
        { x: 50, y: 50 },
      ],
    });
    expect(sflToCanvasState(next).canvasObjects[0].path?.points).toEqual([
      { x: 10, y: 10 },
      { x: 80, y: 20 },
      { x: 50, y: 50 },
    ]);
  });

  it('subtracts the parent frame’s origin, so a nested path keeps its declared points relative', () => {
    const sfl = `sfl 1.4\n\nModel M {\n  Container f {\n    kind: frame\n    layout { position: 200, 100; size: 400, 300 }\n\n    Path p {\n      points: [[0, 0], [40, 0]]\n    }\n  }\n}\n`;
    const before = sflToCanvasState(sfl).canvasObjects.find(e => e.id === 'p');
    expect(before?.path?.points).toEqual([
      { x: 200, y: 100 },
      { x: 240, y: 100 },
    ]);

    const next = applyPathPointChange(sfl, {
      owner: owner('p'),
      points: [
        { x: 210, y: 110 },
        { x: 260, y: 105 },
      ],
    });
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'p')?.path?.points).toEqual([
      { x: 210, y: 110 },
      { x: 260, y: 105 },
    ]);
    expect(next).toContain('points: [[10, 10], [60, 5]]');
  });

  it('is a no-op for an owner that no longer exists', () => {
    const sfl = `sfl 1.4\n\nModel M {\n  Path p { points: [[0, 0], [10, 0]] }\n}\n`;
    expect(applyPathPointChange(sfl, { owner: owner('missing'), points: [{ x: 1, y: 1 }] })).toBe(sfl);
  });
});

describe('insertPath', () => {
  it('inserts a new closed Path block with the declared points and style', () => {
    const sfl = `sfl 1.4\n\nModel M {\n}\n`;
    const next = insertPath(sfl, {
      id: 'region',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 80 },
      ],
      closed: true,
      body: 'style {\n  stroke: "#7c3aed"\n  fill: "#ede9fe"\n}',
    });
    const { svg, diagnostics } = render(next);
    expect(diagnostics).toEqual([]);
    const entity = sflToCanvasState(next).canvasObjects.find(e => e.id === 'region');
    expect(entity?.path?.closed).toBe(true);
    expect(entity?.path?.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ]);
    expect(svg).toContain('data-sf-role="path"');
  });

  it('writes points relative to the parent frame when parentId is given', () => {
    const sfl = `sfl 1.4\n\nModel M {\n  Container f {\n    kind: frame\n    layout { position: 300, 200; size: 400, 300 }\n  }\n}\n`;
    const next = insertPath(sfl, {
      id: 'inner',
      parentId: 'f',
      points: [
        { x: 320, y: 220 },
        { x: 360, y: 220 },
      ],
    });
    expect(next).toContain('points: [[20, 20], [60, 20]]');
    expect(sflToCanvasState(next).canvasObjects.find(e => e.id === 'inner')?.path?.points).toEqual([
      { x: 320, y: 220 },
      { x: 360, y: 220 },
    ]);
  });

  it('refuses fewer than two points, an invalid id, or a name collision', () => {
    const sfl = `sfl 1.4\n\nModel M {\n  Path existing { points: [[0, 0], [1, 1]] }\n}\n`;
    expect(insertPath(sfl, { id: 'x', points: [{ x: 0, y: 0 }] })).toBe(sfl);
    expect(
      insertPath(sfl, {
        id: '1bad',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    ).toBe(sfl);
    expect(
      insertPath(sfl, {
        id: 'existing',
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    ).toBe(sfl);
  });

  it('omits closed/tension when left at their defaults, so the block stays minimal', () => {
    const sfl = `sfl 1.4\n\nModel M {\n}\n`;
    const next = insertPath(sfl, {
      id: 'p',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    });
    expect(next).not.toContain('closed');
    expect(next).not.toContain('tension');
  });
});
