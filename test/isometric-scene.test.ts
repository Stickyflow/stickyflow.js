import { describe, expect, it } from 'vitest';
import { buildIsometricObject } from '../src/renderScene/artifacts/isometric';

describe('Isometric scene builder', () => {
  it('builds top, front and side faces', () => {
    const nodes = buildIsometricObject(
      {
        id: 'relay',
        x: 0,
        y: 0,
        width: 100,
        height: 120,
        depth: 20,
        topFill: '#7c3aed',
        frontFill: '#5b21e8',
        sideFill: '#4c1dca',
        strokeColor: '#111827',
        strokeWidth: 2,
        cornerRadius: 0,
      },
      0,
    );

    expect(nodes).toHaveLength(3);
    expect(nodes.map(node => node.id)).toEqual([
      'isometric-relay-top',
      'isometric-relay-front',
      'isometric-relay-side',
    ]);

    expect(nodes[0]).toMatchObject({
      type: 'path',
      d: 'M 50 0 L 100 20 L 50 40 L 0 20 Z',
      style: {
        fill: { kind: 'solid', color: '#7c3aed' },
      },
    });

    expect(nodes[1]).toMatchObject({
      type: 'path',
      d: 'M 0 20 L 50 40 L 50 120 L 0 100 Z',
    });

    expect(nodes[2]).toMatchObject({
      type: 'path',
      d: 'M 50 40 L 100 20 L 100 100 L 50 120 Z',
    });
  });

  it('rounds exterior corners while keeping the shared center sharp', () => {
    const nodes = buildIsometricObject(
      {
        id: 'rounded',
        x: 0,
        y: 0,
        width: 100,
        height: 120,
        depth: 20,
        cornerRadius: 8,
      },
      0,
    );

    expect(nodes.every(node => node.type === 'path' && node.d.includes(' Q '))).toBe(true);
    expect(nodes[0]).toMatchObject({
      d: expect.stringContaining('L 50 40 Q 50 40 50 40'),
    });
  });
});
