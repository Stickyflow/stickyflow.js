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

// A box around what is selected, an arrow for each axis, a ring to turn it and a square to scale it.
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
  const parts = [`<path d="${outline}" fill="none" stroke="${ACCENT}" stroke-width="${unit}" pointer-events="none"/>`];
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
  const spin = toDrawing([position[0], box.max[1], position[2]]);
  if (spin) {
    parts.push(
      `<circle cx="${spin.x}" cy="${spin.y - 26 * unit}" r="${7 * unit}" fill="#ffffff" stroke="${ACCENT}" stroke-width="${2 * unit}" data-mesh-spin="true" style="cursor:ew-resize"/>`,
    );
  }
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

const SPIN_PER_PIXEL = 0.6;
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
): ((dx: number, dy: number) => HandleResult) | undefined {
  if (handle.hasAttribute('data-mesh-scale')) {
    return (dx, dy) => {
      const factor = Math.max(0.05, 1 + (dx - dy) * SCALE_PER_PIXEL);
      return { scale: scale.map(value => value * factor) as Vec3 };
    };
  }
  if (handle.hasAttribute('data-mesh-spin')) {
    return dx => ({ rotation: [rotation[0], rotation[1] + dx * SPIN_PER_PIXEL, rotation[2]] });
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
