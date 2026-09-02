interface PathPoint {
  x: number;
  y: number;
}

interface RoundedCorner {
  entry: PathPoint;
  exit: PathPoint;
  center: PathPoint;
  radius: number;
  startAngle: number;
  angleSweep: number;
}

interface OrthogonalTurn {
  corner: PathPoint;
  incoming: PathPoint;
  outgoing: PathPoint;
}

const CORNER_SAMPLE_COUNT = 8;

export function roundOrthogonalPath(coordinates: number[], radius: number): number[] {
  if (coordinates.length < 6) {
    return coordinates;
  }

  const points = coordinatePoints(coordinates);
  const roundedPoints = [points[0]];
  for (let index = 1; index < points.length - 1; index++) {
    const corner = createRoundedCorner(points[index - 1], points[index], points[index + 1], radius);
    roundedPoints.push(...(corner ? sampleRoundedCorner(corner) : [points[index]]));
  }
  roundedPoints.push(points[points.length - 1]);
  return pointCoordinates(roundedPoints);
}

function createRoundedCorner(
  previous: PathPoint,
  corner: PathPoint,
  next: PathPoint,
  maximumRadius: number,
): RoundedCorner | null {
  const turn = orthogonalTurn(previous, corner, next);
  if (!turn) {
    return null;
  }

  const radius = Math.min(maximumRadius, axisLength(turn.incoming) * 0.4, axisLength(turn.outgoing) * 0.4);
  if (radius <= 0) {
    return null;
  }
  return roundedCornerGeometry(turn, radius);
}

function orthogonalTurn(previous: PathPoint, corner: PathPoint, next: PathPoint): OrthogonalTurn | null {
  const incoming = { x: corner.x - previous.x, y: corner.y - previous.y };
  const outgoing = { x: next.x - corner.x, y: next.y - corner.y };
  return isOrthogonalTurn(incoming, outgoing) ? { corner, incoming, outgoing } : null;
}

function roundedCornerGeometry(turn: OrthogonalTurn, radius: number): RoundedCorner {
  const incomingDirection = axisDirection(turn.incoming);
  const outgoingDirection = axisDirection(turn.outgoing);
  const entry = offsetPoint(turn.corner, incomingDirection, -radius);
  const exit = offsetPoint(turn.corner, outgoingDirection, radius);
  const center = offsetPoint(entry, outgoingDirection, radius);
  const startAngle = Math.atan2(entry.y - center.y, entry.x - center.x);
  const endAngle = Math.atan2(exit.y - center.y, exit.x - center.x);
  return {
    entry,
    exit,
    center,
    radius,
    startAngle,
    angleSweep: normalizedAngleSweep(endAngle - startAngle),
  };
}

function offsetPoint(point: PathPoint, direction: PathPoint, distance: number): PathPoint {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

function isOrthogonalTurn(incoming: PathPoint, outgoing: PathPoint): boolean {
  const incomingIsAxisAligned = incoming.x === 0 || incoming.y === 0;
  const outgoingIsAxisAligned = outgoing.x === 0 || outgoing.y === 0;
  const isStraight = (incoming.x === 0 && outgoing.x === 0) || (incoming.y === 0 && outgoing.y === 0);
  return incomingIsAxisAligned && outgoingIsAxisAligned && !isStraight;
}

function axisLength(vector: PathPoint): number {
  return Math.abs(vector.x) + Math.abs(vector.y);
}

function axisDirection(vector: PathPoint): PathPoint {
  return {
    x: vector.x !== 0 ? Math.sign(vector.x) : 0,
    y: vector.y !== 0 ? Math.sign(vector.y) : 0,
  };
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

function sampleRoundedCorner(corner: RoundedCorner): PathPoint[] {
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

function coordinatePoints(coordinates: number[]): PathPoint[] {
  const points: PathPoint[] = [];
  for (let index = 0; index < coordinates.length; index += 2) {
    points.push({ x: coordinates[index], y: coordinates[index + 1] });
  }
  return points;
}

function pointCoordinates(points: PathPoint[]): number[] {
  return points.flatMap(point => [point.x, point.y]);
}
