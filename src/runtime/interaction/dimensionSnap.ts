import type { Point } from '../../model/geometry/types';
import { PATH_POINTS_ATTR } from '../../svg/domContract/attributes';
import { pathGeometryOf, pxPerUnit } from '../dom';
import { snapPointToGrid } from './snapGrid';

const REACH_PX = 10;

function candidates(svg: SVGSVGElement, skipId: string | null): Point[] {
  const found: Point[] = [];
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary][data-sf-id]')) {
    const role = node.getAttribute('data-sf-role');
    if (role === 'link' || role === 'dimension' || node.getAttribute('data-sf-id') === skipId) {
      continue;
    }
    const geometry = node.hasAttribute(PATH_POINTS_ATTR) ? pathGeometryOf(node) : null;
    if (geometry) {
      const points = geometry.points.map(([x, y]) => ({ x, y }));
      found.push(...points);
      points.slice(1).forEach((point, index) => {
        found.push({ x: (point.x + points[index].x) / 2, y: (point.y + points[index].y) / 2 });
      });
      continue;
    }
    const { x, y, width, height } = node.getBBox();
    for (const px of [x, x + width / 2, x + width]) {
      for (const py of [y, y + height / 2, y + height]) {
        found.push({ x: px, y: py });
      }
    }
  }
  return found;
}

// What a measured point goes to: the nearest corner, edge middle or path point within reach, and otherwise the grid.
export function snapMeasurePoint(
  svg: SVGSVGElement,
  raw: Point,
  skipId: string | null = null,
): { point: Point; onObject: boolean } {
  const reach = REACH_PX / pxPerUnit(svg);
  let best: Point | null = null;
  let bestDistance = reach;
  for (const candidate of candidates(svg, skipId)) {
    const distance = Math.hypot(candidate.x - raw.x, candidate.y - raw.y);
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best ? { point: best, onObject: true } : { point: snapPointToGrid(svg, raw) ?? raw, onObject: false };
}

export function offsetOf(start: Point, end: Point, pointer: Point): number {
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  return ((pointer.x - start.x) * (end.y - start.y) - (pointer.y - start.y) * (end.x - start.x)) / length;
}
