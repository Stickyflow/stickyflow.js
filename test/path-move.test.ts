import { describe, expect, it } from 'vitest';
import { render, sflToRenderInput } from '../src/index';
import { applyMoveChange } from '../src/runtime/interaction';

// A Path's geometry IS its points: its own layout.position is never read by
// the renderer (buildFreeformPath uses path.points directly). Moving one by
// writing layout.position would therefore round-trip to a no-op, so a move
// rewrites the point list instead.

const PATH_SFL = `sfl 1.4

Model M {
  Path p {
    points: [[0, 80], [40, 20], [90, 70]]
    style { stroke: "#1e293b"; strokeWidth: 2; fill: none }
  }
}`;

const owner = { role: 'path' as const, id: 'p' };

function drawnPath(sfl: string): string {
  return /<path id="sf-path-p"[^>]*d="([^"]+)"/.exec(render(sfl).svg)?.[1] ?? '';
}

describe('moving a Path rewrites its points, not layout.position', () => {
  it('shifts every point by the drag delta', () => {
    const next = applyMoveChange(PATH_SFL, { owner, dx: 25, dy: -10 });
    expect(next).toContain('points: [[25, 70], [65, 10], [115, 60]]');
    expect(next).not.toContain('position');
  });

  it('actually moves the rendered geometry, which writing layout.position would not', () => {
    expect(drawnPath(PATH_SFL)).toBe('M 0 80 L 40 20 L 90 70');
    const next = applyMoveChange(PATH_SFL, { owner, dx: 25, dy: -10 });
    expect(drawnPath(next)).toBe('M 25 70 L 65 10 L 115 60');
  });

  it('leaves a stray layout block alone rather than fighting it', () => {
    const withLayout = PATH_SFL.replace(
      'style { stroke: "#1e293b"; strokeWidth: 2; fill: none }',
      'style { stroke: "#1e293b"; strokeWidth: 2; fill: none }\n    layout { position: 10, 10; size: 140, 120 }',
    );
    const next = applyMoveChange(withLayout, { owner, dx: 5, dy: 5 });
    expect(next).toContain('points: [[5, 85], [45, 25], [95, 75]]');
    expect(next).toContain('position: 10, 10');
  });

  it('rounds to one decimal, like every other geometry patch', () => {
    const next = applyMoveChange(PATH_SFL, { owner, dx: 0.26, dy: 0.24 });
    expect(next).toContain('points: [[0.3, 80.2], [40.3, 20.2], [90.3, 70.2]]');
  });

  it('still writes layout.position for a non-Path owner', () => {
    const entitySfl = `sfl 1.4

Model M {
  Shape e { text: "E"; layout { position: 10, 20; size: 100, 60 } }
}`;
    const next = applyMoveChange(entitySfl, { owner: { role: 'entity', id: 'e' }, dx: 15, dy: 5 });
    expect(next).toContain('position: 25, 25');
  });

  it('keeps a multi-line points list working', () => {
    const multiline = `sfl 1.4

Model M {
  Path p {
    points: [
      [0, 80],
      [40, 20]
    ]
    style { stroke: "#1e293b"; strokeWidth: 2; fill: none }
  }
}`;
    const next = applyMoveChange(multiline, { owner, dx: 10, dy: 10 });
    expect(sflToRenderInput(next).paths?.[0].points).toEqual([
      { x: 10, y: 90 },
      { x: 50, y: 30 },
    ]);
  });
});
