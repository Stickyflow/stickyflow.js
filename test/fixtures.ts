// Representative render fixtures shared by the golden-snapshot suite. Each one
// exercises a distinct part of the pipeline so the committed SVGs form a visual
// contract: any change in geometry, ordering or serialization shows up as a diff.

import type { RenderInput } from '../src/index';
import type { Frame } from '../src/model/frame';
import type { Link } from '../src/model/link';
import type { Shape, ShapeType } from '../src/model/shape';
import type { Swimlane } from '../src/model/swimlane';

const shape = (id: string, shapeType: ShapeType, x: number, extra: Partial<Shape> = {}): Shape =>
  ({
    id,
    shapeType,
    x,
    y: 20,
    width: 120,
    height: 80,
    text: `<${shapeType}>`,
    fillColor: '#eef2ff',
    strokeColor: '#123456',
    strokeWidth: 2,
    layerGroup: 'default',
    orderKey: `a${x}`,
    isVisible: true,
    isLocked: false,
    ...extra,
  }) as Shape;

export const ALL_SHAPE_TYPES: ShapeType[] = [
  'rectangle',
  'rounded_rectangle',
  'diamond',
  'oval',
  'cylinder',
  'document',
  'pill',
  'person',
  'triangle',
  'hexagon',
  'parallelogram',
  'trapezoid',
  'note',
  'cloud',
  'predefined_process',
];

const frame: Frame = {
  id: 'frame',
  x: -20,
  y: -20,
  width: 500,
  height: 180,
  title: 'Frame',
  strokeColor: '#8b5cf6',
  strokeWidth: 2,
  dash: [8, 4],
  cornerRadius: 12,
  fillColor: 'transparent',
  textColor: '#111827',
  fontSize: 16,
  fontWeight: 'bold',
  showLabel: true,
  layerGroup: 'background',
  orderKey: 'a',
  isVisible: true,
  isLocked: false,
};

const swimlane: Swimlane = {
  id: 'swimlane',
  x: 0,
  y: 220,
  width: 400,
  height: 160,
  orientation: 'horizontal',
  lanes: [
    { id: 'one', label: 'One', size: 80 },
    { id: 'two', label: 'Two', size: 80 },
  ],
  strokeColor: '#64748b',
  strokeWidth: 2,
  dash: [],
  cornerRadius: 8,
  fillColor: '#f8fafc',
  textColor: '#334155',
  fontSize: 14,
  fontWeight: 'bold',
  showLaneLabels: true,
  layerGroup: 'background',
  orderKey: 'b',
  isVisible: true,
  isLocked: false,
};

const linkStraight: Link = {
  id: 'straight',
  fromId: 'a',
  toId: 'b',
  startMarker: 'triangle',
  endMarker: 'zero_many',
  style: { pathType: 'straight', color: '#334155', startLabel: '1', endLabel: '0..*' },
  layerGroup: 'content',
  orderKey: 'a',
  isVisible: true,
  isLocked: false,
} as Link;

const linkCurved: Link = {
  id: 'curved',
  fromId: 'a',
  toId: 'b',
  endMarker: 'arrow',
  showText: true,
  text: 'curved',
  style: { pathType: 'curved', color: '#ef4444', strokeWidth: 3 },
  layerGroup: 'content',
  orderKey: 'b',
  isVisible: true,
  isLocked: false,
} as Link;

const linkOrthogonal: Link = {
  id: 'ortho',
  fromId: 'a',
  toId: 'b',
  fromPoint: { kind: 'side', side: 'right', offset: 0.5 },
  toPoint: { kind: 'side', side: 'left', offset: 0.5 },
  waypoints: [
    { x: 160, y: 60 },
    { x: 160, y: 140 },
    { x: 300, y: 140 },
  ],
  endMarker: 'filled_arrow',
  style: { pathType: 'orthogonal', color: '#0369a1', strokeWidth: 3 },
  layerGroup: 'default',
  orderKey: 'c',
  isVisible: true,
  isLocked: false,
} as Link;

export const fixtures: Record<string, RenderInput> = {
  'shapes-all': {
    shapes: ALL_SHAPE_TYPES.map((type, index) => shape(String(index), type, index * 150)),
    frames: [],
    swimlanes: [],
    links: [],
  },
  'frame-titled': { shapes: [], frames: [frame], swimlanes: [], links: [] },
  swimlane: { shapes: [], frames: [], swimlanes: [swimlane], links: [] },
  'links-variety': {
    shapes: [shape('a', 'rectangle', 0), shape('b', 'rectangle', 300)],
    frames: [],
    swimlanes: [],
    links: [
      { link: linkStraight, from: { x: 20, y: 40 }, to: { x: 220, y: 40 } },
      { link: linkCurved, from: { x: 60, y: 100 }, to: { x: 360, y: 260 } },
      { link: linkOrthogonal, from: { x: 120, y: 60 }, to: { x: 300, y: 60 } },
    ],
  },
  gradients: {
    shapes: [
      shape('gradient', 'rectangle', 0, {
        fillColor: {
          type: 'gradient',
          angle: 45,
          stops: [
            { position: 0, color: '#fff' },
            { position: 100, color: '#000' },
          ],
        } as Shape['fillColor'],
      }),
      shape('mesh', 'oval', 200, {
        fillColor: {
          type: 'mesh',
          points: [
            { id: 'p1', x: 20, y: 30, color: '#e0c3fc' },
            { id: 'p2', x: 80, y: 85, color: '#a7e8e0' },
          ],
        } as Shape['fillColor'],
      }),
    ],
    frames: [],
    swimlanes: [],
    links: [],
  },
  'rotation-multiline': {
    shapes: [
      shape('rot', 'rectangle', 0, { rotation: 30, text: 'line one\nline two\nline three', width: 160, height: 120 }),
    ],
    frames: [],
    swimlanes: [],
    links: [],
  },
};

export const SFL_SAMPLE = `sfl 1.2

Style Box {
  shape: rounded_rectangle
  fill: "#e0f2fe"
  stroke: "#0369a1"
}

Style Flow {
  route: orthogonal
  stroke: "#0369a1"
  markerEnd: arrow
}

Model Demo {
  text: "Demo"

  Shape start : Box {
    kind: process
    text: "Start"
    layout {
      position: 100, 100
      size: 160, 70
    }
  }

  Shape finish : Box {
    kind: process
    text: "Finish"
    layout {
      position: 100, 300
      size: 160, 70
    }
  }

  Link go : Flow {
    from: start, bottom (0.5)
    to: finish, top (0.5)
    text: "next"
  }
}
`;
