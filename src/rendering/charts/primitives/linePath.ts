import { freeformPathData } from '../../scene/freeformPath';

export interface LinePathPoint {
  x: number;
  y: number;
}

export function linePathData(points: LinePathPoint[], tension: number): string {
  if (tension > 0) {
    return freeformPathData({ points, tension, closed: false });
  }
  const commands = points.map((point, index) => `${index ? 'L' : ''} ${point.x} ${point.y}`);
  return `M ${commands.join(' ')}`;
}
