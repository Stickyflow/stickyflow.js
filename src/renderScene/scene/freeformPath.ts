import { isStraight, type PathPoint, pathSegments } from '../../model/path';

export interface FreeformPathGeometry {
  points: PathPoint[];
  tension: number;
  closed: boolean;
}

export function freeformPathData(geometry: FreeformPathGeometry): string {
  if (geometry.points.length === 0) {
    return '';
  }
  if (isStraight(geometry)) {
    return linearPathData(geometry);
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

function linearPathData(geometry: FreeformPathGeometry): string {
  const [first, ...remaining] = geometry.points;
  const segments = remaining.map(point => `L ${point.x} ${point.y}`).join(' ');
  return `M ${first.x} ${first.y} ${segments}${geometry.closed ? ' Z' : ''}`;
}
