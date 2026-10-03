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
        fill: '#7c3aed',
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

  it('places the object label above the cube', () => {
    const nodes = buildIsometricObject(
      {
        id: 'server',
        x: 40,
        y: 50,
        width: 100,
        height: 120,
        depth: 20,
        text: 'Your Server',
      },
      0,
    );

    expect(nodes).toHaveLength(5);
    expect(nodes[3]).toMatchObject({
      type: 'path',
      id: 'isometric-server-label-guide',
      d: 'M 90 38 L 90 50',
    });
    expect(nodes[4]).toMatchObject({
      type: 'text',
      id: 'isometric-server-label',
      x: 40,
      y: 18,
      width: 100,
      height: 20,
      lines: ['Your Server'],
      align: 'center',
    });
  });

  it('places an optional shadow on the ground below the cube', () => {
    const nodes = buildIsometricObject(
      {
        id: 'shadowed',
        x: 10,
        y: 20,
        width: 100,
        height: 120,
        depth: 20,
        hasShadow: true,
        shadowStyle: { enabled: true, color: '#312e81', opacity: 0.24 },
      },
      0,
    );

    expect(nodes[0]).toMatchObject({
      type: 'ellipse',
      id: 'isometric-shadowed-ground-shadow',
      cx: 60,
      cy: 140,
      rx: 35,
      ry: 7,
      style: {
        fill: { kind: 'solid', color: '#312e81' },
        opacity: 0.24,
        pointerEvents: 'none',
      },
    });
  });
});
