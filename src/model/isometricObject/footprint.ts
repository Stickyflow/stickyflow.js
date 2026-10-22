import type { Point } from '../geometry/types';
import { AXIS_COS, AXIS_SIN } from './geometry';
import type { IsometricObject } from './types';

// [along the width, along the depth], both from 0 to 1
export type FootprintPoint = [number, number];

export interface ExtrudedSide {
  points: [Point, Point, Point, Point];
  light: number;
  depth: number;
  smoothStart: boolean;
  smoothEnd: boolean;
}

export interface ExtrudedFootprint {
  top: Point[];
  sides: ExtrudedSide[];
}

type Frame = Pick<IsometricObject, 'x' | 'y' | 'width' | 'height' | 'depth'>;

function signedArea(points: readonly FootprintPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

export function cleanFootprint(points: readonly FootprintPoint[] | undefined): FootprintPoint[] {
  const clean = (points ?? []).filter(
    point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]),
  );
  const unique = clean.filter((point, index) => {
    const next = clean[(index + 1) % clean.length];
    return point[0] !== next[0] || point[1] !== next[1];
  });
  return unique.length >= 3 ? unique : [];
}

const ARC_STEP = Math.PI / 12;

export function roundFootprint(
  points: readonly FootprintPoint[],
  radius: number,
  width: number,
  depth: number,
): FootprintPoint[] {
  if (!(radius > 0) || width <= 0 || depth <= 0) {
    return [...points];
  }
  const world = points.map(([u, v]) => ({ x: u * width, y: v * depth }));
  const rounded: FootprintPoint[] = [];
  for (let i = 0; i < world.length; i += 1) {
    const here = world[i];
    const before = world[(i - 1 + world.length) % world.length];
    const after = world[(i + 1) % world.length];
    const a = { x: before.x - here.x, y: before.y - here.y };
    const b = { x: after.x - here.x, y: after.y - here.y };
    const lengthA = Math.hypot(a.x, a.y);
    const lengthB = Math.hypot(b.x, b.y);
    const cos = (a.x * b.x + a.y * b.y) / (lengthA * lengthB);
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    if (!Number.isFinite(angle) || angle < 1e-3 || Math.PI - angle < 1e-3) {
      rounded.push(points[i]);
      continue;
    }
    const reach = Math.min(radius / Math.tan(angle / 2), Math.min(lengthA, lengthB) / 2);
    const effective = reach * Math.tan(angle / 2);
    const unitA = { x: a.x / lengthA, y: a.y / lengthA };
    const unitB = { x: b.x / lengthB, y: b.y / lengthB };
    const from = { x: here.x + unitA.x * reach, y: here.y + unitA.y * reach };
    const to = { x: here.x + unitB.x * reach, y: here.y + unitB.y * reach };
    const bisector = { x: unitA.x + unitB.x, y: unitA.y + unitB.y };
    const bisectorLength = Math.hypot(bisector.x, bisector.y);
    const centerDistance = effective / Math.sin(angle / 2);
    const center = {
      x: here.x + (bisector.x / bisectorLength) * centerDistance,
      y: here.y + (bisector.y / bisectorLength) * centerDistance,
    };
    const start = Math.atan2(from.y - center.y, from.x - center.x);
    let sweep = Math.atan2(to.y - center.y, to.x - center.x) - start;
    sweep -= 2 * Math.PI * Math.round(sweep / (2 * Math.PI));
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) / ARC_STEP));
    for (let step = 0; step <= steps; step += 1) {
      const t = start + (sweep * step) / steps;
      rounded.push([(center.x + effective * Math.cos(t)) / width, (center.y + effective * Math.sin(t)) / depth]);
    }
  }
  return rounded;
}

export function extrudeFootprint(
  frame: Frame,
  footprint: readonly FootprintPoint[],
  cornerRadius = 0,
): ExtrudedFootprint {
  const width = Math.max(0, frame.width);
  const depth = Math.max(0, frame.depth);
  const height = Math.max(0, frame.height);
  const points = roundFootprint(cleanFootprint(footprint), cornerRadius, width, depth);
  const apexX = frame.x + depth * AXIS_COS;
  const project = ([u, v]: FootprintPoint, z: number): Point => ({
    x: apexX + (u * width - v * depth) * AXIS_COS,
    y: frame.y + (u * width + v * depth) * AXIS_SIN + z,
  });

  const top = points.map(point => project(point, 0));
  const turn = signedArea(points) >= 0 ? 1 : -1;
  const edges = points.map((from, i) => {
    const to = points[(i + 1) % points.length];
    const edgeU = (to[0] - from[0]) * width;
    const edgeV = (to[1] - from[1]) * depth;
    const length = Math.hypot(edgeU, edgeV);
    const normalU = length === 0 ? 0 : (edgeV / length) * turn;
    const normalV = length === 0 ? 0 : (-edgeU / length) * turn;
    return { from, to, length, normalU, normalV, visible: length > 0 && normalU + normalV > 1e-9 };
  });
  const sameWay = (a: (typeof edges)[number], b: (typeof edges)[number]) => {
    return a.visible && b.visible && a.normalU * b.normalU + a.normalV * b.normalV > Math.cos(0.5);
  };

  const sides: ExtrudedSide[] = [];
  edges.forEach((edge, i) => {
    if (!edge.visible) {
      return;
    }
    const before = edges[(i - 1 + edges.length) % edges.length];
    const after = edges[(i + 1) % edges.length];
    const { from, to } = edge;
    sides.push({
      points: [project(from, 0), project(to, 0), project(to, height), project(from, height)],
      light: 0.72 + 0.28 * Math.max(0, Math.min(1, edge.normalV / (Math.abs(edge.normalU) + Math.abs(edge.normalV)))),
      depth: (from[0] + to[0]) / 2 + (from[1] + to[1]) / 2,
      smoothStart: sameWay(before, edge),
      smoothEnd: sameWay(edge, after),
    });
  });
  sides.sort((a, b) => a.depth - b.depth);
  return { top, sides };
}
