import { describe, expect, it } from 'vitest';
import { isometricFaces, isometricTopFaceCenter } from '../src/model/isometricObject';
import { buildIsometricObject } from '../src/renderScene/artifacts/isometric';
import type { RenderNode } from '../src/renderScene/scene';

const find = (nodes: RenderNode[], id: string) => {
  const node = nodes.find(candidate => candidate.id === id);
  if (!node) {
    throw new Error(`no node ${id}`);
  }
  return node as RenderNode & { d: string; style: Record<string, unknown> };
};

const polygon = (points: ReadonlyArray<{ x: number; y: number }>) =>
  `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`;

describe('Isometric scene builder', () => {
  it('builds top, front and side faces from one fill, with a hull and seams around them', () => {
    const object = {
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
    };
    const nodes = buildIsometricObject(object, 0);

    expect(nodes.map(node => node.id)).toEqual([
      'isometric-relay-hull',
      'isometric-relay-top',
      'isometric-relay-front',
      'isometric-relay-side',
      'isometric-relay-seams',
    ]);

    const faces = isometricFaces(object);
    const top = find(nodes, 'isometric-relay-top');
    const front = find(nodes, 'isometric-relay-front');
    const side = find(nodes, 'isometric-relay-side');
    expect(top.d).toBe(polygon(faces.top));
    expect(front.d).toBe(polygon(faces.front));
    expect(side.d).toBe(polygon(faces.right));

    expect(top.style.fill).toEqual({ kind: 'solid', color: '#7c3aed' });
    const shades = [front, side].map(node => (node.style.fill as { color: string }).color);
    expect(shades.every(color => color !== '#7c3aed')).toBe(true);
    expect(shades[0]).not.toBe(shades[1]);
  });

  it('rounds the outer silhouette and leaves the faces straight', () => {
    const nodes = buildIsometricObject(
      { id: 'rounded', x: 0, y: 0, width: 100, height: 120, depth: 20, cornerRadius: 8 },
      0,
    );

    expect(find(nodes, 'isometric-rounded-hull').d).toContain(' Q ');
    for (const face of ['top', 'front', 'side']) {
      expect(find(nodes, `isometric-rounded-${face}`).d).not.toContain(' Q ');
    }
    expect(find(nodes, 'isometric-rounded-top').style.clip).toEqual({
      type: 'path',
      d: find(nodes, 'isometric-rounded-hull').d,
    });
  });

  it('places the object label above the top face', () => {
    const object = { id: 'server', x: 40, y: 50, width: 100, height: 120, depth: 20, text: 'Your Server' };
    const nodes = buildIsometricObject(object, 0);
    const center = isometricTopFaceCenter(object);

    expect(nodes.slice(-2).map(node => node.id)).toEqual(['isometric-server-label-guide', 'isometric-server-label']);
    expect(find(nodes, 'isometric-server-label-guide').d).toBe(
      `M ${center.x} ${center.y} L ${center.x} ${center.y - 12}`,
    );
    expect(nodes[nodes.length - 1]).toMatchObject({
      type: 'text',
      x: 40,
      y: center.y - 12 - 20,
      height: 20,
      lines: ['Your Server'],
      align: 'center',
    });
  });

  it('places an optional shadow on the ground below the object', () => {
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

    const shadow = find(nodes, 'isometric-shadowed-ground-shadow');
    expect(shadow).toMatchObject({
      type: 'path',
      style: {
        fill: { kind: 'solid', color: '#312e81' },
        pointerEvents: 'none',
      },
    });
    expect(shadow.order).toBeLessThan(find(nodes, 'isometric-shadowed-top').order);
    expect(shadow.style.opacity as number).toBeGreaterThan(0.24);
    expect(shadow.style.blur).toBe(8);
  });
});
