import { describe, expect, it } from 'vitest';
import { render, renderCanvas } from '../src/index';
import type { Shape, ShapeType } from '../src/model/shape';
import type { RenderInput } from '../src/renderInput/types';
import { ALL_SHAPE_TYPES } from './fixtures';

interface Envelope {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function extendPoint(env: Envelope, x: number, y: number): void {
  env.minX = Math.min(env.minX, x);
  env.minY = Math.min(env.minY, y);
  env.maxX = Math.max(env.maxX, x);
  env.maxY = Math.max(env.maxY, y);
}

const CURVE_SAMPLES = 64;

function extendPathData(env: Envelope, d: string): void {
  const tokens = d.match(/[MLCZ]|-?[\d.]+(?:e-?\d+)?/g) ?? [];
  let index = 0;
  const next = () => Number(tokens[index++]);
  let current: [number, number] = [0, 0];
  while (index < tokens.length) {
    const command = tokens[index++];
    if (command === 'M' || command === 'L') {
      current = [next(), next()];
      extendPoint(env, current[0], current[1]);
    } else if (command === 'C') {
      const [x0, y0] = current;
      const [x1, y1, x2, y2, x3, y3] = [next(), next(), next(), next(), next(), next()];
      for (let step = 1; step <= CURVE_SAMPLES; step++) {
        const t = step / CURVE_SAMPLES;
        const u = 1 - t;
        extendPoint(
          env,
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        );
      }
      current = [x3, y3];
    }
  }
}

function drawnEnvelope(input: RenderInput, id: string): Envelope {
  const env: Envelope = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const { scene } = renderCanvas(input);
  for (const node of scene.nodes) {
    if (node.identity?.id !== id) {
      continue;
    }
    if (node.type === 'rect') {
      extendPoint(env, node.x, node.y);
      extendPoint(env, node.x + node.width, node.y + node.height);
    } else if (node.type === 'ellipse') {
      extendPoint(env, node.cx - node.rx, node.cy - node.ry);
      extendPoint(env, node.cx + node.rx, node.cy + node.ry);
    } else if (node.type === 'path') {
      extendPathData(env, node.d);
    }
  }
  return env;
}

function shapeInput(shapeType: ShapeType, box: { x: number; y: number; width: number; height: number }): RenderInput {
  const shape: Shape = {
    id: 's',
    shapeType,
    ...box,
    text: '',
    fillColor: '#fff',
    strokeColor: '#000',
    strokeWidth: 1,
    layerGroup: 'default',
    orderKey: 'a',
    isVisible: true,
    isLocked: false,
  };
  return { shapes: [shape], frames: [], swimlanes: [], links: [] };
}

const BOXES = [
  { label: 'square 100x100', box: { x: 0, y: 0, width: 100, height: 100 } },
  { label: 'wide 200x80', box: { x: 10, y: 10, width: 200, height: 80 } },
  { label: 'tall 80x200', box: { x: -20, y: 5, width: 80, height: 200 } },
];

const FITTED_SHAPES = new Set<ShapeType>(['person']);

describe('a shape draws exactly the box it declares', () => {
  for (const { label, box } of BOXES) {
    describe(label, () => {
      for (const shapeType of ALL_SHAPE_TYPES) {
        if (FITTED_SHAPES.has(shapeType)) {
          continue;
        }
        it(shapeType, () => {
          const env = drawnEnvelope(shapeInput(shapeType, box), 's');
          expect(env.minX).toBeCloseTo(box.x, 6);
          expect(env.minY).toBeCloseTo(box.y, 6);
          expect(env.maxX).toBeCloseTo(box.x + box.width, 6);
          expect(env.maxY).toBeCloseTo(box.y + box.height, 6);
        });
      }
    });
  }

  it('person stays inside its box, touches it on the limiting axis, and declares the full box', () => {
    for (const { box } of BOXES) {
      const env = drawnEnvelope(shapeInput('person', box), 's');
      const width = env.maxX - env.minX;
      const height = env.maxY - env.minY;
      expect(env.minX).toBeGreaterThanOrEqual(box.x - 1e-6);
      expect(env.maxX).toBeLessThanOrEqual(box.x + box.width + 1e-6);
      expect(env.minY).toBeGreaterThanOrEqual(box.y - 1e-6);
      expect(env.maxY).toBeLessThanOrEqual(box.y + box.height + 1e-6);
      const fitsWidth = Math.abs(width - box.width) < 1e-6;
      const fitsHeight = Math.abs(height - box.height) < 1e-6;
      expect(fitsWidth || fitsHeight).toBe(true);
      expect(env.minX + width / 2).toBeCloseTo(box.x + box.width / 2, 6);
      expect(env.minY + height / 2).toBeCloseTo(box.y + box.height / 2, 6);
      const svg = render(shapeSfl('person', box)).svg;
      expect(svg).toContain(`data-sf-symbol-bounds="${box.x},${box.y},${box.width},${box.height}"`);
    }
  });

  it('document is one smooth wave along the bottom, not a row of scallops', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const { scene } = renderCanvas(shapeInput('document', box));
    const path = scene.nodes.find(node => node.type === 'path' && node.identity?.id === 's');
    expect(path?.type === 'path' ? (path.d.match(/C/g) ?? []).length : 0).toBe(4);
  });
});

describe('a Symbol always tags its declared box, independent of whether its points reach every edge', () => {
  const symbol = (points: [number, number][], box: { x: number; y: number; width: number; height: number }) => `sfl 1.4

Symbol S {
  points: [${points.map(([x, y]) => `[${x}, ${y}]`).join(', ')}]
}

Model M {
  Shape e {
    shape: S
    layout { position: ${box.x}, ${box.y}; size: ${box.width}, ${box.height} }
  }
}
`;

  const cases: Array<[label: string, points: [number, number][]]> = [
    [
      'touches every edge',
      [
        [0.5, 0],
        [1, 1],
        [0, 1],
      ],
    ],
    [
      'stops short of the bottom edge (the bug this attribute exists to prevent)',
      [
        [0.5, 0],
        [1, 0.4],
        [0.5, 0.8],
        [0, 0.4],
      ],
    ],
    [
      'stops short on every side',
      [
        [0.7, 0.2],
        [0.8, 0.7],
        [0.3, 0.8],
        [0.2, 0.3],
      ],
    ],
  ];

  for (const [label, points] of cases) {
    it(label, () => {
      const box = { x: 20, y: 30, width: 160, height: 90 };
      const { svg, diagnostics } = render(symbol(points, box));
      expect(diagnostics).toEqual([]);
      expect(svg).toContain(`data-sf-symbol-bounds="${box.x},${box.y},${box.width},${box.height}"`);
    });
  }
});

function shapeSfl(shapeType: string, box: { x: number; y: number; width: number; height: number }): string {
  return `sfl 1.4

Model M {
  Shape s {
    style { shape: ${shapeType} }
    layout { position: ${box.x}, ${box.y}; size: ${box.width}, ${box.height} }
  }
}
`;
}
