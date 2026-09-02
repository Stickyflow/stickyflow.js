import type { PathPoint } from '../../model/paths';

export interface FreeformPathGeometry {
  points: PathPoint[];
  tension: number;
  closed: boolean;
}

export function freeformPathData(geometry: FreeformPathGeometry): string {
  if (geometry.points.length === 0) {
    return '';
  }
  if (geometry.points.length < 3 || geometry.tension <= 0) {
    return linearPathData(geometry);
  }
  return smoothPathData(geometry);
}

function linearPathData(geometry: FreeformPathGeometry): string {
  const [first, ...remaining] = geometry.points;
  const segments = remaining.map(point => `L ${point.x} ${point.y}`).join(' ');
  return `M ${first.x} ${first.y} ${segments}${geometry.closed ? ' Z' : ''}`;
}

function smoothPathData(geometry: FreeformPathGeometry): string {
  const first = geometry.points[0];
  const segmentCount = geometry.closed ? geometry.points.length : geometry.points.length - 1;
  const commands = [`M ${first.x} ${first.y}`];
  for (let index = 0; index < segmentCount; index++) {
    commands.push(curveSegmentCommand(geometry, index));
  }
  if (geometry.closed) {
    commands.push('Z');
  }
  return commands.join(' ');
}

function curveSegmentCommand(geometry: FreeformPathGeometry, index: number): string {
  const previous = freeformPointAt(geometry, index - 1);
  const start = freeformPointAt(geometry, index);
  const end = freeformPointAt(geometry, index + 1);
  const next = freeformPointAt(geometry, index + 2);
  const factor = geometry.tension / 6;
  const firstControl = { x: start.x + (end.x - previous.x) * factor, y: start.y + (end.y - previous.y) * factor };
  const secondControl = { x: end.x - (next.x - start.x) * factor, y: end.y - (next.y - start.y) * factor };
  return `C ${firstControl.x} ${firstControl.y} ${secondControl.x} ${secondControl.y} ${end.x} ${end.y}`;
}

function freeformPointAt(geometry: FreeformPathGeometry, index: number): PathPoint {
  if (geometry.closed) {
    return geometry.points[(index + geometry.points.length) % geometry.points.length];
  }
  return geometry.points[Math.max(0, Math.min(geometry.points.length - 1, index))];
}
