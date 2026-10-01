import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState, sflToRenderInput } from '../src/index';
import { namedPortToPoint } from '../src/model/geometry/routing';

// Schematics category (stickyflow-atlas parity, SFL 1.4 §3.5): a Link
// endpoint can be `entity.portName` - a dot-path whose last segment names a
// `Port` child block on the Symbol the entity's `shape:` points at. `at:` is
// normalized like Symbol.points (0..1, relative to the instance's own
// bounding box).

const SFL = `sfl 1.4

Symbol OpAmp {
  points: [[0, 0], [1, 0.5], [0, 1]]
  Port in_plus  { at: 0, 0.25 }
  Port in_minus { at: 0, 0.75 }
  Port out      { at: 1, 0.5 }
}

Model board {
  Shape amp1 { shape: OpAmp; layout { position: 0, 0; size: 100, 60 } }
  Shape amp2 { shape: OpAmp; layout { position: 300, 0; size: 100, 60 } }

  Link rueckkopplung { from: amp1.out; to: amp2.in_minus }
}`;

describe('Named Ports (§3.5, entity.portName)', () => {
  it('parses Port child blocks into the Symbol definition', () => {
    const state = sflToCanvasState(SFL);
    const amp1 = state.entities.find(e => e.id === 'amp1');
    expect(amp1?.symbol?.ports).toEqual([
      { name: 'in_plus', at: [0, 0.25] },
      { name: 'in_minus', at: [0, 0.75] },
      { name: 'out', at: [1, 0.5] },
    ]);
  });

  it('resolves a 2-segment endpoint whose last segment matches a port name as a Named Port, not a nested entity lookup', () => {
    const state = sflToCanvasState(SFL);
    const link = state.links.find(l => l.id === 'rueckkopplung');
    expect(link?.fromId).toBe('amp1');
    expect(link?.fromPort).toBe('out');
    expect(link?.fromSide).toBeUndefined();
    expect(link?.toId).toBe('amp2');
    expect(link?.toPort).toBe('in_minus');
    expect(link?.toSide).toBeUndefined();
  });

  it('resolves the port to a world point via the bounding box (unrotated)', () => {
    const input = sflToRenderInput(SFL);
    const resolved = input.links.find(link => link.link.id === 'rueckkopplung');
    expect(resolved?.link.fromPoint).toEqual({ kind: 'port', port: 'out' });
    expect(resolved?.link.toPoint).toEqual({ kind: 'port', port: 'in_minus' });
    expect(resolved?.from).toEqual({ x: 100, y: 30 });
    expect(resolved?.to).toEqual({ x: 300, y: 45 });
  });

  it('does not misdetect a plain (non-port) 2-segment endpoint as a Named Port', () => {
    // amp2 has no Symbol at all - "missing" on its endpoint therefore can't
    // match any symbol.ports, so sflToCanvasState's endpoint() falls through
    // to the pre-existing generic dot-path lookup (last segment as a bare
    // name), exactly as it did before Named Ports existed. This guards
    // against the new "entity.portName" check accidentally swallowing every
    // ordinary multi-segment endpoint.
    const sfl = `sfl 1.4

Model board {
  Shape amp1 { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
  Shape amp2 { shape: rectangle; layout { position: 300, 0; size: 100, 60 } }

  Link l { from: amp1; to: amp2.missing }
}`;
    const state = sflToCanvasState(sfl);
    const link = state.links[0];
    expect(link.toPort).toBeUndefined();
    expect(link.toId).toBe('missing'); // unresolved last segment, used verbatim as id (pre-existing fallback)
  });

  // The "missing symbol/port -> fall back to the entity's center" branch in
  // sflToRenderInput's pointFor is defensive: sflToCanvasState only ever sets
  // fromPort/toPort after confirming the port exists on the resolved
  // symbol, so that branch is unreachable through the pure SFL-text pipeline
  // - it exists for callers of the lower-level Link/Shape API (e.g. the
  // interaction layer) that could otherwise hand pointFor an inconsistent
  // named-port reference. See the equivalent comment in stickyflow-atlas's
  // useResolvedLinks.ts.

  it('renders end-to-end without crashing and produces a link path', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('sf-link-rueckkopplung');
    expect(svg).not.toContain('[object Object]');
  });

  it('namedPortToPoint accounts for rotation the same way portToPoint does', () => {
    // Unrotated: at=(1, 0.5) on a 100x60 box at (0,0) is the right-edge midpoint.
    expect(namedPortToPoint({ x: 0, y: 0, width: 100, height: 60 }, [1, 0.5])).toEqual({ x: 100, y: 30 });
    // Rotated 90°: the box's local right edge now points toward +Y in world
    // space (rotateVector(50, 0, 90) ~= (0, 50)), so the port lands below the
    // box's center rather than to its right.
    const rotated = namedPortToPoint({ x: 0, y: 200, width: 100, height: 60, rotation: 90 }, [1, 0.5]);
    expect(rotated.x).toBeCloseTo(50, 9);
    expect(rotated.y).toBeCloseTo(280, 9);
  });
});
