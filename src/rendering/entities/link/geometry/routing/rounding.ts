import type { Point } from '../../../../../model/geometry/types';

interface RoundedCorner {
  entry: Point;
  exit: Point;
  center: Point;
  radius: number;
  startAngle: number;
  angleSweep: number;
}

const CORNER_SAMPLE_COUNT = 8;

export function roundOrthogonalPoints(coordinates: number[], maximumRadius: number): number[] {
  if (coordinates.length < 6) {
    return coordinates;
  }
  const points = coordinatePoints(coordinates);
  const roundedPoints = [points[0]];
  for (let index = 1; index < points.length - 1; index++) {
    const corner = createRoundedCorner(points[index - 1], points[index], points[index + 1], maximumRadius);
    roundedPoints.push(...(corner ? sampleRoundedCorner(corner) : [points[index]]));
  }
  roundedPoints.push(points[points.length - 1]);
  return roundedPoints.flatMap(point => [point.x, point.y]);
}

function createRoundedCorner(previous: Point, corner: Point, next: Point, maximumRadius: number): RoundedCorner | null {
  const incoming = { x: corner.x - previous.x, y: corner.y - previous.y };
  const outgoing = { x: next.x - corner.x, y: next.y - corner.y };
  const incomingIsAxisAligned = incoming.x === 0 || incoming.y === 0;
  const outgoingIsAxisAligned = outgoing.x === 0 || outgoing.y === 0;
  const isStraight = (incoming.x === 0 && outgoing.x === 0) || (incoming.y === 0 && outgoing.y === 0);
  if (!incomingIsAxisAligned || !outgoingIsAxisAligned || isStraight) {
    return null;
  }
  const radius = Math.min(maximumRadius, axisLength(incoming) * 0.4, axisLength(outgoing) * 0.4);
  if (radius <= 0) {
    return null;
  }
  const incomingDirection = axisDirection(incoming);
  const outgoingDirection = axisDirection(outgoing);
  const entry = offsetPoint(corner, incomingDirection, -radius);
  const exit = offsetPoint(corner, outgoingDirection, radius);
  const center = offsetPoint(entry, outgoingDirection, radius);
  const startAngle = Math.atan2(entry.y - center.y, entry.x - center.x);
  const endAngle = Math.atan2(exit.y - center.y, exit.x - center.x);
  return { entry, exit, center, radius, startAngle, angleSweep: normalizedAngleSweep(endAngle - startAngle) };
}

function offsetPoint(point: Point, direction: Point, distance: number): Point {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

function axisLength(vector: Point): number {
  return Math.abs(vector.x) + Math.abs(vector.y);
}

function axisDirection(vector: Point): Point {
  return { x: vector.x !== 0 ? Math.sign(vector.x) : 0, y: vector.y !== 0 ? Math.sign(vector.y) : 0 };
}

function normalizedAngleSweep(angle: number): number {
  if (angle > Math.PI) {
    return angle - 2 * Math.PI;
  }
  if (angle < -Math.PI) {
    return angle + 2 * Math.PI;
  }
  return angle;
}

function sampleRoundedCorner(corner: RoundedCorner): Point[] {
  const points = [corner.entry];
  for (let sampleIndex = 1; sampleIndex < CORNER_SAMPLE_COUNT - 1; sampleIndex++) {
    const progress = sampleIndex / (CORNER_SAMPLE_COUNT - 1);
    const angle = corner.startAngle + corner.angleSweep * progress;
    points.push({
      x: corner.center.x + Math.cos(angle) * corner.radius,
      y: corner.center.y + Math.sin(angle) * corner.radius,
    });
  }
  points.push(corner.exit);
  return points;
}

function coordinatePoints(coordinates: number[]): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < coordinates.length; index += 2) {
    points.push({ x: coordinates[index], y: coordinates[index + 1] });
  }
  return points;
}
