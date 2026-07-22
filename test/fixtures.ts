// Representative render fixtures shared by the golden-snapshot suite. Each one
// exercises a distinct part of the pipeline so the committed SVGs form a visual
// contract: any change in geometry, ordering or serialization shows up as a diff.
import type { Shape, ShapeType } from '../src/model/shapes';
import type { Frame } from '../src/model/frames';
import type { Swimlane } from '../src/model/swimlanes';
import type { Table } from '../src/model/tables';
import type { Link } from '../src/model/links';
import type { RenderInput } from '../src/index';

const shape = (id: string, shapeType: ShapeType, x: number, extra: Partial<Shape> = {}): Shape => ({
  id, boardId: 'board', shapeType, x, y: 20, width: 120, height: 80,
  text: `<${shapeType}>`, fillColor: '#eef2ff', strokeColor: '#123456', strokeWidth: 2,
  layer_group: 'default', order_key: `a${x}`, is_visible: true, is_locked: false, createdAt: '',
  ...extra,
} as Shape);

export const ALL_SHAPE_TYPES: ShapeType[] = [
  'rectangle', 'rounded_rectangle', 'diamond', 'circle', 'oval', 'container_rectangle',
  'cylinder', 'document', 'pill', 'person', 'triangle', 'hexagon', 'parallelogram', 'trapezoid',
];

const frame: Frame = {
  id: 'frame', board_id: 'board', x: -20, y: -20, width: 500, height: 180, title: 'Frame',
  stroke_color: '#8b5cf6', stroke_width: 2, dash: [8, 4], corner_radius: 12,
  fill_color: 'transparent', text_color: '#111827', font_size: 16, font_weight: 'bold', show_label: true,
  layer_group: 'background', order_key: 'a', is_visible: true, is_locked: false, created_at: '',
};

const swimlane: Swimlane = {
  id: 'swimlane', board_id: 'board', x: 0, y: 220, width: 400, height: 160,
  orientation: 'horizontal', lanes: [
    { id: 'one', label: 'One', size: 80 }, { id: 'two', label: 'Two', size: 80 },
  ], stroke_color: '#64748b', stroke_width: 2, dash: [], corner_radius: 8,
  fill_color: '#f8fafc', text_color: '#334155', font_size: 14, font_weight: 'bold', show_lane_labels: true,
  layer_group: 'background', order_key: 'b', is_visible: true, is_locked: false, created_at: '',
};

const table: Table = {
  id: 'users', board_id: 'board', name: 'users', title: 'Users', x: 10, y: 20, width: 220, height: 60,
  columns: [{ id: 'name', label: 'Name', width: 160, type: 'text' }, { id: 'pk', label: 'PK', width: 60, type: 'boolean' }],
  rows: [{ id: 'r1', cells: { name: 'id', pk: true } }, { id: 'r2', cells: { name: 'email', pk: false } }],
  stroke_color: '#9b42df', stroke_width: 2, dash: [], corner_radius: 8, fill_color: '#ffffff',
  text_color: '#111111', font_size: 14, font_weight: 'bold', show_header: true, row_height: 36,
  layer_group: 'background', order_key: 'a', is_visible: true, is_locked: false, created_at: '',
} as Table;

const linkStraight: Link = {
  id: 'straight', fromId: 'a', toId: 'b', startMarker: 'triangle', endMarker: 'zero_many',
  style: { pathType: 'straight', color: '#334155', startLabel: '1', endLabel: '0..*' },
  layer_group: 'content', order_key: 'a', is_visible: true, is_locked: false,
} as Link;

const linkCurved: Link = {
  id: 'curved', fromId: 'a', toId: 'b', endMarker: 'arrow', showText: true, text: 'curved',
  style: { pathType: 'curved', color: '#ef4444', strokeWidth: 3 },
  layer_group: 'content', order_key: 'b', is_visible: true, is_locked: false,
} as Link;

const linkOrthogonal: Link = {
  id: 'ortho', fromId: 'a', toId: 'b',
  fromPoint: { side: 'right', offset: .5 }, toPoint: { side: 'left', offset: .5 },
  waypoints: [{ x: 160, y: 60 }, { x: 160, y: 140 }, { x: 300, y: 140 }],
  endMarker: 'filled_arrow', style: { pathType: 'orthogonal', color: '#0369a1', strokeWidth: 3 },
  layer_group: 'default', order_key: 'c', is_visible: true, is_locked: false,
} as Link;

export const fixtures: Record<string, RenderInput> = {
  'shapes-all': {
    shapes: ALL_SHAPE_TYPES.map((type, index) => shape(String(index), type, index * 150)),
    frames: [], swimlanes: [], links: [],
  },
  'frame-titled': { shapes: [], frames: [frame], swimlanes: [], links: [] },
  'swimlane': { shapes: [], frames: [], swimlanes: [swimlane], links: [] },
  'table': { shapes: [], frames: [], swimlanes: [], tables: [table], links: [] },
  'links-variety': {
    shapes: [shape('a', 'rectangle', 0), shape('b', 'rectangle', 300)],
    frames: [], swimlanes: [],
    links: [
      { link: linkStraight, from: { x: 20, y: 40 }, to: { x: 220, y: 40 } },
      { link: linkCurved, from: { x: 60, y: 100 }, to: { x: 360, y: 260 } },
      { link: linkOrthogonal, from: { x: 120, y: 60 }, to: { x: 300, y: 60 } },
    ],
  },
  'gradients': {
    shapes: [
      shape('gradient', 'rectangle', 0, {
        fillColor: { type: 'gradient', angle: 45, stops: [{ position: 0, color: '#fff' }, { position: 100, color: '#000' }] } as Shape['fillColor'],
      }),
      shape('mesh', 'circle', 200, {
        fillColor: { type: 'mesh', points: [
          { id: 'p1', x: 20, y: 30, color: '#e0c3fc' }, { id: 'p2', x: 80, y: 85, color: '#a7e8e0' },
        ] } as Shape['fillColor'],
      }),
    ],
    frames: [], swimlanes: [], links: [],
  },
  'rotation-multiline': {
    shapes: [shape('rot', 'rectangle', 0, { rotation: 30, text: 'line one\nline two\nline three', width: 160, height: 120 })],
    frames: [], swimlanes: [], links: [],
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

  Entity start : Box {
    kind: process
    text: "Start"
    layout {
      position: 100, 100
      size: 160, 70
    }
  }

  Entity finish : Box {
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
