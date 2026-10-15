import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState, sflToRenderInput } from '../src/index';
import { pointAtNormalizedPort } from '../src/model/geometry/ports';

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
    const amp1 = state.canvasObjects.find(e => e.id === 'amp1');
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
    const sfl = `sfl 1.4

Model board {
  Shape amp1 { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
  Shape amp2 { shape: rectangle; layout { position: 300, 0; size: 100, 60 } }

  Link l { from: amp1; to: amp2.missing }
}`;
    const state = sflToCanvasState(sfl);
    const link = state.links[0];
    expect(link.toPort).toBeUndefined();
    expect(link.toId).toBe('missing');
  });

  it('renders end-to-end without crashing and produces a link path', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('sf-link-rueckkopplung');
    expect(svg).not.toContain('[object Object]');
  });

  it('pointAtNormalizedPort accounts for rectangle rotation', () => {
    expect(pointAtNormalizedPort({ x: 0, y: 0, width: 100, height: 60 }, [1, 0.5])).toEqual({ x: 100, y: 30 });
    const rotated = pointAtNormalizedPort({ x: 0, y: 200, width: 100, height: 60, rotation: 90 }, [1, 0.5]);
    expect(rotated.x).toBeCloseTo(50, 9);
    expect(rotated.y).toBeCloseTo(280, 9);
  });
});
