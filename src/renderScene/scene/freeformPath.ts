import { isStraight, type PathPoint, pathSegments } from '../../model/path';

export interface FreeformPathGeometry {
  points: PathPoint[];
  tension: number;
  closed: boolean;
  cornerRadius?: number;
}

export function freeformPathData(geometry: FreeformPathGeometry): string {
  if (geometry.points.length === 0) {
    return '';
  }
  if (isStraight(geometry)) {
    return (geometry.cornerRadius ?? 0) > 0 && geometry.points.length > 2
      ? roundedPathData(geometry)
      : linearPathData(geometry);
  }
  const first = geometry.points[0];
  const commands = [`M ${first.x} ${first.y}`];
  for (const { to, controls } of pathSegments(geometry)) {
    commands.push(
      controls
        ? `C ${controls[0].x} ${controls[0].y} ${controls[1].x} ${controls[1].y} ${to.x} ${to.y}`
        : `L ${to.x} ${to.y}`,
    );
  }
  if (geometry.closed) {
    commands.push('Z');
  }
  return commands.join(' ');
}

// Each corner becomes a curve that starts and ends on its two sides, and takes at most half of each side.
function roundedPathData(geometry: FreeformPathGeometry): string {
  const { points, closed } = geometry;
  const radius = geometry.cornerRadius ?? 0;
  const count = points.length;
  const near = (from: PathPoint, to: PathPoint, distance: number) => {
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const share = Math.min(distance, length / 2) / length;
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
  };
  const corners = closed ? points.map((_, index) => index) : points.slice(1, -1).map((_, index) => index + 1);
  const commands: string[] = [];
  if (!closed) {
    commands.push(`M ${points[0].x} ${points[0].y}`);
  }
  corners.forEach((index, order) => {
    const point = points[index];
    const start = near(point, points[(index + count - 1) % count], radius);
    const end = near(point, points[(index + 1) % count], radius);
    commands.push(
      `${order === 0 && closed ? 'M' : 'L'} ${start.x} ${start.y}`,
      `Q ${point.x} ${point.y} ${end.x} ${end.y}`,
    );
  });
  const last = points[count - 1];
  commands.push(closed ? 'Z' : `L ${last.x} ${last.y}`);
  return commands.join(' ');
}

function linearPathData(geometry: FreeformPathGeometry): string {
  const [first, ...remaining] = geometry.points;
  const segments = remaining.map(point => `L ${point.x} ${point.y}`).join(' ');
  return `M ${first.x} ${first.y} ${segments}${geometry.closed ? ' Z' : ''}`;
}
