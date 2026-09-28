import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

// Schematics category (stickyflow-atlas parity, SFL 1.4 §5.5): a `Symbol`
// block is a free, named shape - referenced as the VALUE of `shape:` (not
// via `:` composition like Style/Layout). Its `points` are normalized 0..1,
// relative to the referencing instance's own bounding box, so one definition
// renders at any size. Implicitly closed; `tension` optionally smooths it.

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
    const tri = state.entities.find(e => e.id === 'tri');
    expect(tri?.shapeType).toBe('symbol');
    expect(tri?.symbol?.points).toEqual([
      [0.5, 0],
      [1, 1],
      [0, 1],
    ]);
  });

  it('renders the symbol as a closed polygon scaled to the instance bounding box', () => {
    const { svg } = render(SFL);
    // points normalized [[0.5,0],[1,1],[0,1]] scaled by width=100, height=60,
    // offset by x=0, y=0: (50,0) (100,60) (0,60), implicitly closed.
    expect(svg).toMatch(/<path id="sf-shape-tri"[^>]*d="M 50 0 L 100 60 L 0 60 Z"/);
  });

  it('does not affect an entity with a built-in shape', () => {
    const sfl = `sfl 1.4

Model board {
  Shape a { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
}`;
    const state = sflToCanvasState(sfl);
    expect(state.entities[0].shapeType).toBe('rectangle');
    expect(state.entities[0].symbol).toBeUndefined();
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
    // symbolDefs only registers a Symbol with >= 2 points - an unresolved
    // shape: falls back to `shapeType = shapeRef` (the bare name), same as
    // any other unrecognized shape: value (a pre-existing, Symbol-unrelated
    // gap: buildRenderScene's SHAPE_DEFAULTS lookup assumes shapeType is
    // always one of the built-in types or 'symbol', so rendering an entity
    // whose `shape:` matches neither is already broken before this feature -
    // out of scope here, not exercised by this test).
    expect(state.entities[0].shapeType).toBe('Degenerate');
    expect(state.entities[0].symbol).toBeUndefined();
  });

  it('tags the rendered path with its points/tension so live resize can rebuild the exact polygon', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('data-sf-symbol-points="[[0.5,0],[1,1],[0,1]]"');
    expect(svg).toContain('data-sf-symbol-tension="0"');
  });

  it("tags the rendered path with its declared entity box, not the polygon's own tight bbox", () => {
    // points [[0.5,0],[1,1],[0,1]] only reach y=1 at the base : SVG getBBox()
    // of the drawn triangle IS the full 60px here (base touches the bottom
    // edge), so this fixture alone would not expose the bug (see the Blob
    // fixture below, whose points stop short of every edge).
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
    // The polygon's own tight bbox tops out at y=80 (0.8 * 100), well short
    // of the declared 100 : the resize/selection system must use the
    // declared box, or a live resize snaps the moment it starts (the bug
    // this attribute exists to prevent).
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
    // Straight-segment rendering would use "L" commands; a positive tension
    // routes through the Catmull-Rom cubic branch ("C" commands) instead.
    expect(svg).toMatch(/<path id="sf-shape-b"[^>]*d="M 50 0 C[^"]+"/);
  });
});
