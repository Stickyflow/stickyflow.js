import type { Point, Rect } from '../types';

const DEGREES_TO_RADIANS = Math.PI / 180;

function rotatePoint(point: Point, degrees: number): Point {
  const radians = degrees * DEGREES_TO_RADIANS;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine };
}

function rectangleCenter(rectangle: Rect): Point {
  return { x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };
}

export function worldPointToRectangle(rectangle: Rect, worldPoint: Point): Point {
  const center = rectangleCenter(rectangle);
  const pointRelativeToCenter = { x: worldPoint.x - center.x, y: worldPoint.y - center.y };
  return rectangle.rotation ? rotatePoint(pointRelativeToCenter, -rectangle.rotation) : pointRelativeToCenter;
}

export function rectanglePointToWorld(rectangle: Rect, rectanglePoint: Point): Point {
  const center = rectangleCenter(rectangle);
  const rotatedPoint = rectangle.rotation ? rotatePoint(rectanglePoint, rectangle.rotation) : rectanglePoint;
  return { x: center.x + rotatedPoint.x, y: center.y + rotatedPoint.y };
}
