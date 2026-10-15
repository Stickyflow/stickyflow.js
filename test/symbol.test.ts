import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

const SFL = `sfl 1.4

Symbol Triangle {
  points: [[0.5, 0], [1, 1], [0, 1]]
}

Model board {
  Shape tri { shape: Triangle; layout { position: 0, 0; size: 100, 60 } }
}`;

describe('Symbol (§5.5, free-form shape)', () => {
  it('parses a Symbol block and attaches it to an entity referencing it via shape:', () => {
    const state = sflToCanvasState(SFL);
    const tri = state.canvasObjects.find(e => e.id === 'tri');
    expect(tri?.shapeType).toBe('symbol');
    expect(tri?.symbol?.points).toEqual([
      [0.5, 0],
      [1, 1],
      [0, 1],
    ]);
  });

  it('renders the symbol as a closed polygon scaled to the instance bounding box', () => {
    const { svg } = render(SFL);
    expect(svg).toMatch(/<path id="sf-shape-tri"[^>]*d="M 50 0 L 100 60 L 0 60 Z"/);
  });

  it('does not affect an entity with a built-in shape', () => {
    const sfl = `sfl 1.4

Model board {
  Shape a { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
}`;
    const state = sflToCanvasState(sfl);
    expect(state.canvasObjects[0].shapeType).toBe('rectangle');
    expect(state.canvasObjects[0].symbol).toBeUndefined();
  });

  it('does not register a Symbol with fewer than 2 points (no area)', () => {
    const sfl = `sfl 1.4

Symbol Degenerate {
  points: [[0.5, 0.5]]
}

Model board {
  Shape a { shape: Degenerate; layout { position: 0, 0; size: 100, 60 } }
}`;
    const state = sflToCanvasState(sfl);
    expect(state.canvasObjects[0].shapeType).toBe('Degenerate');
    expect(state.canvasObjects[0].symbol).toBeUndefined();
  });

  it('tags the rendered path with its points/tension so live resize can rebuild the exact polygon', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('data-sf-symbol-points="[[0.5,0],[1,1],[0,1]]"');
    expect(svg).toContain('data-sf-symbol-tension="0"');
  });

  it("tags the rendered path with its declared entity box, not the polygon's own tight bbox", () => {
    const { svg } = render(SFL);
    expect(svg).toContain('data-sf-symbol-bounds="0,0,100,60"');
  });

  it('a Symbol whose points stop short of an edge still tags the full declared box (not the shorter rendered extent)', () => {
    const sfl = `sfl 1.4

Symbol Kite {
  points: [[0.5, 0], [1, 0.4], [0.5, 0.8], [0, 0.4]]
}

Model board {
  Shape k { shape: Kite; layout { position: 0, 0; size: 100, 100 } }
}`;
    const { svg } = render(sfl);
    expect(svg).toContain('data-sf-symbol-bounds="0,0,100,100"');
  });

  it('scales tension into a smoothed curve instead of straight polygon segments', () => {
    const sfl = `sfl 1.4

Symbol Blob {
  points: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]
  tension: 0.5
}

Model board {
  Shape b { shape: Blob; layout { position: 0, 0; size: 100, 100 } }
}`;
    const { svg } = render(sfl);
    expect(svg).toMatch(/<path id="sf-shape-b"[^>]*d="M 50 0 C[^"]+"/);
  });
});
