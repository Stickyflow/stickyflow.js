import type { Point } from '../geometry/types';

export interface CornerFillet {
  start: Point;
  end: Point;
  radius: number;
  // The SVG sweep flag of the arc from start to end.
  sweep: 0 | 1;
}

export interface CornerFrame {
  // The unit vector from the corner into the corner, halfway between its two sides.
  inward: Point;
  // The sine of half the angle between the sides: a circle of radius r has its middle r / halfSine from the corner.
  halfSine: number;
  maxRadius: number;
}

const FLAT = 1e-3;

function sides(previous: Point, corner: Point, next: Point) {
  const toPrevious = { x: previous.x - corner.x, y: previous.y - corner.y };
  const toNext = { x: next.x - corner.x, y: next.y - corner.y };
  const previousLength = Math.hypot(toPrevious.x, toPrevious.y);
  const nextLength = Math.hypot(toNext.x, toNext.y);
  if (previousLength === 0 || nextLength === 0) {
    return null;
  }
  const a = { x: toPrevious.x / previousLength, y: toPrevious.y / previousLength };
  const b = { x: toNext.x / nextLength, y: toNext.y / nextLength };
  const angle = Math.acos(Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y)));
  if (angle < FLAT || Math.PI - angle < FLAT) {
    return null;
  }
  return { a, b, angle, reach: Math.min(previousLength, nextLength) / 2 };
}

// How a corner can be rounded, or null where the sides lie on one line and there is no corner.
export function cornerFrame(previous: Point, corner: Point, next: Point): CornerFrame | null {
  const found = sides(previous, corner, next);
  if (!found) {
    return null;
  }
  const { a, b, angle, reach } = found;
  const length = Math.hypot(a.x + b.x, a.y + b.y);
  return {
    inward: { x: (a.x + b.x) / length, y: (a.y + b.y) / length },
    halfSine: Math.sin(angle / 2),
    maxRadius: reach * Math.tan(angle / 2),
  };
}

// The circular arc that touches both sides of a corner. It uses at most half of each side, and is smaller when the sides are too short.
export function cornerFillet(previous: Point, corner: Point, next: Point, radius: number): CornerFillet | null {
  const found = sides(previous, corner, next);
  if (!found || radius <= 0) {
    return null;
  }
  const { a, b, angle, reach } = found;
  const tangent = Math.tan(angle / 2);
  const setback = Math.min(radius / tangent, reach);
  return {
    start: { x: corner.x + a.x * setback, y: corner.y + a.y * setback },
    end: { x: corner.x + b.x * setback, y: corner.y + b.y * setback },
    radius: setback * tangent,
    sweep: a.x * b.y - a.y * b.x < 0 ? 1 : 0,
  };
}
