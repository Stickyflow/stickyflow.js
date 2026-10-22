import type { PathPoint } from './types';

export interface PathFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PathSymbol {
  points: Array<[number, number] | [number, number, number]>;
  width: number;
  height: number;
}

export function pathBounds(points: readonly PathPoint[]): PathFrame {
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

const round = (value: number) => Math.round(value * 10_000) / 10_000;

export function pathToSymbol(points: readonly PathPoint[]): PathSymbol {
  if (points.length === 0) {
    return { points: [], width: 0, height: 0 };
  }
  const frame = pathBounds(points);
  const unit = (value: number, size: number) => (size === 0 ? 0 : round(value / size));
  return {
    width: frame.width,
    height: frame.height,
    points: points.map(point => {
      const x = unit(point.x - frame.x, frame.width);
      const y = unit(point.y - frame.y, frame.height);
      return point.tension === undefined ? [x, y] : [x, y, point.tension];
    }),
  };
}

export function symbolToPath(
  points: ReadonlyArray<readonly [number, number] | readonly [number, number, number]>,
  frame: PathFrame,
): PathPoint[] {
  return points.map(point => {
    const placed = { x: frame.x + point[0] * frame.width, y: frame.y + point[1] * frame.height };
    return point[2] === undefined ? placed : { ...placed, tension: point[2] };
  });
}
