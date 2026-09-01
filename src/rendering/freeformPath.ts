import type { PathPoint } from '../model/paths';

export function freeformPathData(points: PathPoint[], tension: number, closed: boolean): string {
  if (points.length === 0) {
    return '';
  }
  if (points.length < 3 || tension <= 0) {
    return `M ${points[0].x} ${points[0].y} ${points
      .slice(1)
      .map(point => `L ${point.x} ${point.y}`)
      .join(' ')}${closed ? ' Z' : ''}`;
  }

  const pointAt = (index: number): PathPoint =>
    closed ? points[(index + points.length) % points.length] : points[Math.max(0, Math.min(points.length - 1, index))];
  const segmentCount = closed ? points.length : points.length - 1;
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 0; index < segmentCount; index++) {
    const previous = pointAt(index - 1);
    const start = pointAt(index);
    const end = pointAt(index + 1);
    const next = pointAt(index + 2);
    const factor = tension / 6;
    commands.push(
      `C ${start.x + (end.x - previous.x) * factor} ${start.y + (end.y - previous.y) * factor} ${end.x - (next.x - start.x) * factor} ${end.y - (next.y - start.y) * factor} ${end.x} ${end.y}`,
    );
  }
  if (closed) {
    commands.push('Z');
  }
  return commands.join(' ');
}
