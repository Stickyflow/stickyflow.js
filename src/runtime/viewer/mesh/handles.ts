import type { Vec3 } from '../../../model/mesh';
import { type Box, boxCorner } from './camera';

export const AXES: ReadonlyArray<{ name: string; axis: Vec3; color: string }> = [
  { name: 'x', axis: [1, 0, 0], color: '#e5484d' },
  { name: 'y', axis: [0, 1, 0], color: '#30a46c' },
  { name: 'z', axis: [0, 0, 1], color: '#3e63dd' },
];

const ACCENT = '#9b42df';
const BOX_EDGES = [0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7];
const OBJECT_CORNERS = [
  ['nw', 0, 0],
  ['ne', 1, 0],
  ['se', 1, 1],
  ['sw', 0, 1],
] as const;
const MIN_OBJECT_SIZE = 8;

type DrawingPoint = { x: number; y: number };
type ToDrawing = (point: readonly number[]) => DrawingPoint | undefined;

// The place of an object on a Canvas, in the units of that Canvas.
export interface MeshObjectBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const axisLength = ({ min, max }: Box): number =>
  Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) * 0.6;

const along = (position: Vec3, axis: Vec3, length: number): number[] =>
  position.map((value, index) => value + axis[index] * length);

const RING_STEPS = 64;
// A ring turns in steps of this many degrees, so a body stands square again easily.
const TURN_STEP = 5;

// Two ways across the plane a ring of an axis lies in, so that the first, the second and the axis turn as x, y and z do.
const ACROSS: Record<string, [Vec3, Vec3]> = {
  x: [
    [0, 1, 0],
    [0, 0, 1],
  ],
  y: [
    [0, 0, 1],
    [1, 0, 0],
  ],
  z: [
    [1, 0, 0],
    [0, 1, 0],
  ],
};

const ringPoint = (position: Vec3, name: string, radius: number, angle: number): number[] => {
  const [u, v] = ACROSS[name];
  return position.map((value, i) => value + radius * (u[i] * Math.cos(angle) + v[i] * Math.sin(angle)));
};

const ringRadius = (box: Box): number => axisLength(box) * 0.85;

// Rotation about x, then y, then z, in degrees, as rows; and back.
function rows([x, y, z]: Vec3): number[] {
  const [a, b, c] = [x, y, z].map(angle => (angle * Math.PI) / 180);
  const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)];
  return [
    cc * cb,
    cc * sb * sa - sc * ca,
    cc * sb * ca + sc * sa,
    sc * cb,
    sc * sb * sa + cc * ca,
    sc * sb * ca - cc * sa,
    -sb,
    cb * sa,
    cb * ca,
  ];
}

function anglesOf(m: number[]): Vec3 {
  const degrees = 180 / Math.PI;
  const sb = Math.max(-1, Math.min(1, -m[6]));
  const b = Math.asin(sb) * degrees;
  // A quarter turn about y makes the turns about x and z one: all of it goes into the turn about x.
  if (Math.abs(sb) > 1 - 1e-9) {
    return [Math.atan2(m[1] * Math.sign(sb), m[4]) * degrees, b, 0];
  }
  return [Math.atan2(m[7], m[8]) * degrees, b, Math.atan2(m[3], m[0]) * degrees];
}

const product = (a: number[], b: number[]): number[] =>
  [0, 1, 2].flatMap(i => [0, 1, 2].map(j => a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]));

// A turn about an axis of the world, added to the turn a body has.
function turnedAbout(rotation: Vec3, name: string, degrees: number): Vec3 {
  const about: Vec3 = name === 'x' ? [degrees, 0, 0] : name === 'y' ? [0, degrees, 0] : [0, 0, degrees];
  const neat = (value: number) => Math.round(value * 100) / 100 || 0;
  return anglesOf(product(rows(about), rows(rotation))).map(neat) as Vec3;
}

// A box around what is selected, an arrow for each axis, a ring about each axis to turn it, and a square to scale it.
export function meshHandlesMarkup(position: Vec3, box: Box, toDrawing: ToDrawing, unit: number): string {
  const origin = toDrawing(position);
  if (!origin) {
    return '';
  }
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(index => toDrawing(boxCorner(box, index)));
  let outline = '';
  for (let i = 0; i < BOX_EDGES.length; i += 2) {
    const [a, b] = [corners[BOX_EDGES[i]], corners[BOX_EDGES[i + 1]]];
    if (a && b) {
      outline += `M${a.x} ${a.y}L${b.x} ${b.y}`;
    }
  }
  const parts = [
    `<path d="${outline}" fill="none" stroke="${ACCENT}" stroke-width="${unit}" pointer-events="none" data-mesh-box="true"/>`,
  ];
  const length = axisLength(box);
  for (const { name, axis, color } of AXES) {
    const end = toDrawing(along(position, axis, length));
    if (end) {
      parts.push(
        `<line x1="${origin.x}" y1="${origin.y}" x2="${end.x}" y2="${end.y}" stroke="transparent" stroke-width="${14 * unit}" data-mesh-axis="${name}" style="cursor:grab"/>`,
        `<line x1="${origin.x}" y1="${origin.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="${3 * unit}" stroke-linecap="round" pointer-events="none"/>`,
        `<circle cx="${end.x}" cy="${end.y}" r="${5 * unit}" fill="${color}" pointer-events="none"/>`,
      );
    }
  }
  // The rings go under the arrows, so an arrow is taken where the two cross.
  const radius = ringRadius(box);
  const rings: string[] = [];
  for (const { name, color } of AXES) {
    const points = Array.from({ length: RING_STEPS + 1 }, (_, k) =>
      toDrawing(ringPoint(position, name, radius, (k / RING_STEPS) * Math.PI * 2)),
    );
    if (points.some(point => !point)) {
      continue;
    }
    const d = (points as DrawingPoint[]).map((point, k) => `${k ? 'L' : 'M'}${point.x} ${point.y}`).join('');
    rings.push(
      `<path d="${d}" fill="none" stroke="transparent" stroke-width="${12 * unit}" data-mesh-turn="${name}" style="cursor:grab"/>`,
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${2 * unit}" stroke-opacity="0.75" pointer-events="none" data-mesh-ring="${name}"/>`,
    );
  }
  parts.splice(1, 0, ...rings);
  const size = toDrawing(box.max);
  if (size) {
    parts.push(
      `<rect x="${size.x - 6 * unit}" y="${size.y - 6 * unit}" width="${12 * unit}" height="${12 * unit}" fill="${ACCENT}" stroke="#ffffff" stroke-width="${unit}" data-mesh-scale="true" style="cursor:nwse-resize"/>`,
    );
  }
  return parts.join('');
}

// An outline on a surface, seen in perspective, with a corner to pull at each end.
export function objectOutlineMarkup(
  box: MeshObjectBox,
  toDrawing: (x: number, y: number) => DrawingPoint | undefined,
  unit: number,
): string | undefined {
  const corners = OBJECT_CORNERS.map(([name, x, y]) => ({
    name,
    at: toDrawing(box.x + x * box.width, box.y + y * box.height),
  }));
  if (corners.some(corner => !corner.at)) {
    return undefined;
  }
  const outline = `M${corners.map(({ at }) => `${at?.x} ${at?.y}`).join('L')}Z`;
  return [
    `<path d="${outline}" fill="transparent" stroke="${ACCENT}" stroke-width="${2 * unit}" data-mesh-object="move" style="cursor:move"/>`,
    ...corners.map(
      ({ name, at }) =>
        `<rect x="${(at?.x ?? 0) - 5 * unit}" y="${(at?.y ?? 0) - 5 * unit}" width="${10 * unit}" height="${10 * unit}" fill="#ffffff" stroke="${ACCENT}" stroke-width="${unit}" data-mesh-object="${name}" style="cursor:nwse-resize"/>`,
    ),
  ].join('');
}

// Where an object is after a part of its outline was pulled: 'move', or the name of a corner.
export function draggedBox(from: MeshObjectBox, part: string, dx: number, dy: number): MeshObjectBox {
  if (part === 'move') {
    return { ...from, x: from.x + dx, y: from.y + dy };
  }
  const right = from.x + from.width;
  const bottom = from.y + from.height;
  const x = part.includes('w') ? Math.min(from.x + dx, right - MIN_OBJECT_SIZE) : from.x;
  const y = part.includes('n') ? Math.min(from.y + dy, bottom - MIN_OBJECT_SIZE) : from.y;
  return {
    x,
    y,
    width: part.includes('w') ? right - x : Math.max(MIN_OBJECT_SIZE, from.width + dx),
    height: part.includes('n') ? bottom - y : Math.max(MIN_OBJECT_SIZE, from.height + dy),
  };
}

const SCALE_PER_PIXEL = 0.006;

interface HandleTarget {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  box: Box;
}

interface HandleResult {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

// What a drag on a handle does to what is selected, from how far the pointer went. An axis is followed on the screen.
export function handleDrag(
  handle: Element,
  { position, rotation, scale, box }: HandleTarget,
  toDrawing: ToDrawing,
  pixelsPerUnit: number,
  // Where the drag began, in the units of the drawing: a ring follows the pointer round the middle of what it turns.
  start?: DrawingPoint,
): ((dx: number, dy: number) => HandleResult) | undefined {
  const ring = handle.getAttribute('data-mesh-turn');
  const middle = toDrawing(position);
  if (ring && start && middle) {
    // The way the ring runs on the screen as it turns the right way about its axis: the angle of two points of it.
    const radius = ringRadius(box);
    const [p, q] = [toDrawing(ringPoint(position, ring, radius, 0)), toDrawing(ringPoint(position, ring, radius, 0.2))];
    const angle = (point: DrawingPoint) => Math.atan2(point.y - middle.y, point.x - middle.x);
    const wrap = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
    const way = p && q ? Math.sign(wrap(angle(q) - angle(p))) || 1 : 1;
    // Added up as the pointer goes round, so a turn may go past half a circle.
    let last = angle(start);
    let total = 0;
    return (dx, dy) => {
      const now = angle({ x: start.x + dx / pixelsPerUnit, y: start.y + dy / pixelsPerUnit });
      total += wrap(now - last);
      last = now;
      const degrees = Math.round((total * way * 180) / Math.PI / TURN_STEP) * TURN_STEP;
      return { rotation: turnedAbout(rotation, ring, degrees) };
    };
  }
  if (handle.hasAttribute('data-mesh-scale')) {
    return (dx, dy) => {
      const factor = Math.max(0.05, 1 + (dx - dy) * SCALE_PER_PIXEL);
      return { scale: scale.map(value => value * factor) as Vec3 };
    };
  }
  const axis = AXES.find(item => item.name === handle.getAttribute('data-mesh-axis'))?.axis;
  if (!axis) {
    return undefined;
  }
  const length = axisLength(box);
  const from = toDrawing(position);
  const to = toDrawing(along(position, axis, length));
  if (!from || !to) {
    return undefined;
  }
  const screen = { x: (to.x - from.x) * pixelsPerUnit, y: (to.y - from.y) * pixelsPerUnit };
  const reach = Math.hypot(screen.x, screen.y) || 1;
  return (dx, dy) => {
    const moved = ((dx * screen.x + dy * screen.y) / (reach * reach)) * length;
    return { position: along(position, axis, moved) as Vec3 };
  };
}
