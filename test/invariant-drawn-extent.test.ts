import { describe, expect, it } from 'vitest';
import { render, renderCanvas } from '../src/index';
import type { Shape, ShapeType } from '../src/model/shapes';
import type { RenderInput } from '../src/renderInput/types';
import { ALL_SHAPE_TYPES } from './fixtures';

// This is the invariant the Symbol resize-snap bug (fixed this session) was
// an instance of: whatever the resize/selection overlay treats as an
// entity's box must match what its geometry actually draws, or the live
// preview and the committed render disagree the moment a drag starts. Swept
// here across every built-in shape type and several boxes, so a future
// geometry change that breaks the invariant fails a test instead of only
// showing up as a UI glitch.

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
      const numbers = (node.d.match(/-?[\d.]+/g) ?? []).map(Number);
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        extendPoint(env, numbers[i], numbers[i + 1]);
      }
    }
  }
  return env;
}

function shapeInput(shapeType: ShapeType, box: { x: number; y: number; width: number; height: number }): RenderInput {
  const shape: Shape = {
    id: 's',
    boardId: 'b',
    shapeType,
    ...box,
    text: '',
    fillColor: '#fff',
    strokeColor: '#000',
    strokeWidth: 1,
    layer_group: 'default',
    order_key: 'a',
    is_visible: true,
    is_locked: false,
    createdAt: '',
  };
  return { shapes: [shape], frames: [], swimlanes: [], links: [] };
}

const BOXES = [
  { label: 'square 100x100', box: { x: 0, y: 0, width: 100, height: 100 } },
  { label: 'wide 200x80', box: { x: 10, y: 10, width: 200, height: 80 } },
  { label: 'tall 80x200', box: { x: -20, y: 5, width: 80, height: 200 } },
];

// document's wavy bottom edge overshoots its own declared box (a pre-existing
// geometry bug this test found, not something this change fixes) : its Q
// control points sit at height + wave*0.15 below the top, which pulls the
// drawn curve that far past the box rather than stopping at it.
// person doesn't fill a non-square box at all : radius = min(width, height)
// means the whole figure is sized off the shorter side and drawn centered on
// it, so the longer side is neither reached nor respected as a limit.
const KNOWN_EXCEPTIONS = new Set<ShapeType>(['document', 'person']);

describe('a shape draws exactly the box it declares', () => {
  for (const { label, box } of BOXES) {
    describe(label, () => {
      for (const shapeType of ALL_SHAPE_TYPES) {
        if (KNOWN_EXCEPTIONS.has(shapeType)) {
          continue;
        }
        it(shapeType, () => {
          const env = drawnEnvelope(shapeInput(shapeType, box), 's');
          expect(env).toEqual({ minX: box.x, minY: box.y, maxX: box.x + box.width, maxY: box.y + box.height });
        });
      }
    });
  }

  it('document overshoots its own box at the bottom by a known amount (pre-existing, not asserted as correct)', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const env = drawnEnvelope(shapeInput('document', box), 's');
    expect(env.minX).toBe(box.x);
    expect(env.minY).toBe(box.y);
    expect(env.maxX).toBe(box.x + box.width);
    expect(env.maxY).toBeGreaterThan(box.y + box.height);
  });

  it('person does not fill a non-square box (pre-existing, not asserted as correct)', () => {
    const wide = { x: 0, y: 0, width: 200, height: 80 };
    const env = drawnEnvelope(shapeInput('person', wide), 's');
    expect(env.maxX).toBeLessThan(wide.x + wide.width);
    expect(env.maxY).toBeGreaterThan(wide.y + wide.height);
  });
});

describe('a Symbol always tags its declared box, independent of whether its points reach every edge', () => {
  const symbol = (points: [number, number][], box: { x: number; y: number; width: number; height: number }) => `sfl 1.4

Symbol S {
  points: [${points.map(([x, y]) => `[${x}, ${y}]`).join(', ')}]
}

Model M {
  Entity e {
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
