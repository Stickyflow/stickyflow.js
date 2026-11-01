import { isStraight, type PathPoint, pathSegments } from '../../model/path';
import { cornerFillet } from '../../model/path/fillet';

export interface FreeformPathGeometry {
  points: PathPoint[];
  tension: number;
  closed: boolean;
  cornerRadius?: number;
  cornerRadii?: number[];
}

export function radiusAt(geometry: Pick<FreeformPathGeometry, 'cornerRadius' | 'cornerRadii'>, index: number): number {
  return geometry.cornerRadii?.[index] ?? geometry.cornerRadius ?? 0;
}

export function freeformPathData(geometry: FreeformPathGeometry): string {
  if (geometry.points.length === 0) {
    return '';
  }
  if (isStraight(geometry)) {
    return geometry.points.length > 2 && geometry.points.some((_, index) => radiusAt(geometry, index) > 0)
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

// Each corner with a radius becomes a circular arc that touches both of its sides.
function roundedPathData(geometry: FreeformPathGeometry): string {
  const { points, closed } = geometry;
  const count = points.length;
  const corners = closed ? points.map((_, index) => index) : points.slice(1, -1).map((_, index) => index + 1);
  const commands: string[] = [];
  if (!closed) {
    commands.push(`M ${points[0].x} ${points[0].y}`);
  }
  corners.forEach((index, order) => {
    const point = points[index];
    const fillet = cornerFillet(
      points[(index + count - 1) % count],
      point,
      points[(index + 1) % count],
      radiusAt(geometry, index),
    );
    const move = order === 0 && closed ? 'M' : 'L';
    if (fillet) {
      commands.push(
        `${move} ${fillet.start.x} ${fillet.start.y}`,
        `A ${fillet.radius} ${fillet.radius} 0 0 ${fillet.sweep} ${fillet.end.x} ${fillet.end.y}`,
      );
    } else {
      commands.push(`${move} ${point.x} ${point.y}`);
    }
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
