import type { Point } from './types';

interface RoundedCorner {
  vertex: Point;
  start: Point;
  end: Point;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function toward(from: Point, to: Point, distanceFromStart: number): Point {
  const length = distance(from, to);

  if (length === 0) {
    return from;
  }

  const ratio = distanceFromStart / length;

  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function roundedCorner(
  previous: Point,
  vertex: Point,
  next: Point,
  requestedRadius: number,
): RoundedCorner {
  const radius = Math.max(
    0,
    Math.min(
      requestedRadius,
      distance(vertex, previous) / 2,
      distance(vertex, next) / 2,
    ),
  );

  return {
    vertex,
    start: toward(vertex, previous, radius),
    end: toward(vertex, next, radius),
  };
}

export function roundedPolygonPath(
  points: readonly Point[],
  radius: number,
): string {
  if (points.length < 3) {
    return '';
  }

  if (radius <= 0) {
    const [first, ...rest] = points;
    return `M ${first.x} ${first.y} ${rest
      .map(point => `L ${point.x} ${point.y}`)
      .join(' ')} Z`;
  }

  const corners = points.map((vertex, index) =>
    roundedCorner(
      points[(index - 1 + points.length) % points.length],
      vertex,
      points[(index + 1) % points.length],
      radius,
    ),
  );

  const commands = [`M ${corners[0].end.x} ${corners[0].end.y}`];

  for (let index = 1; index < corners.length; index++) {
    const corner = corners[index];
    commands.push(
      `L ${corner.start.x} ${corner.start.y}`,
      `Q ${corner.vertex.x} ${corner.vertex.y} ${corner.end.x} ${corner.end.y}`,
    );
  }

  const first = corners[0];
  commands.push(
    `L ${first.start.x} ${first.start.y}`,
    `Q ${first.vertex.x} ${first.vertex.y} ${first.end.x} ${first.end.y}`,
    'Z',
  );

  return commands.join(' ');
}