import type { Point } from '../geometry/types';
import type { Dimension } from './types';

export interface DimensionGeometry {
  length: number;
  line: [Point, Point];
  extensions: Array<[Point, Point]>;
  label: { center: Point; angle: number };
}

const GAP = 4;
const OVERSHOOT = 6;

const along = (origin: Point, direction: Point, distance: number): Point => ({
  x: origin.x + direction.x * distance,
  y: origin.y + direction.y * distance,
});

export function dimensionLength(dimension: Pick<Dimension, 'start' | 'end'>): number {
  return Math.hypot(dimension.end.x - dimension.start.x, dimension.end.y - dimension.start.y);
}

export function dimensionText(dimension: Pick<Dimension, 'start' | 'end' | 'text' | 'unit'>): string {
  if (dimension.text !== undefined) {
    return dimension.text;
  }
  const length = Math.round(dimensionLength(dimension) * 10) / 10;
  return `${length}${dimension.unit ? ` ${dimension.unit}` : ''}`;
}

export function dimensionGeometry(
  dimension: Pick<Dimension, 'start' | 'end' | 'offset' | 'fontSize'>,
): DimensionGeometry {
  const length = dimensionLength(dimension);
  const direction =
    length === 0
      ? { x: 1, y: 0 }
      : { x: (dimension.end.x - dimension.start.x) / length, y: (dimension.end.y - dimension.start.y) / length };
  const normal = { x: direction.y, y: -direction.x };
  const side = dimension.offset < 0 ? -1 : 1;
  const line: [Point, Point] = [
    along(dimension.start, normal, dimension.offset),
    along(dimension.end, normal, dimension.offset),
  ];

  const extensions =
    Math.abs(dimension.offset) <= GAP
      ? []
      : [dimension.start, dimension.end].map((point): [Point, Point] => [
          along(point, normal, GAP * side),
          along(point, normal, dimension.offset + OVERSHOOT * side),
        ]);

  const lift = ((dimension.fontSize ?? 11) * 0.75 + 2) * side;
  const middle = { x: (line[0].x + line[1].x) / 2, y: (line[0].y + line[1].y) / 2 };
  let angle = (Math.atan2(direction.y, direction.x) * 180) / Math.PI;
  if (angle > 90) {
    angle -= 180;
  } else if (angle <= -90) {
    angle += 180;
  }
  return { length, line, extensions, label: { center: along(middle, normal, lift), angle } };
}
