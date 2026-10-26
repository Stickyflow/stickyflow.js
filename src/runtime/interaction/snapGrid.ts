import { AXIS_COS, AXIS_SIN } from '../../model/isometricObject';

export const SNAP_GRID_ATTR = 'data-sf-snap-grid';
export const SNAP_ATTR = 'data-sf-snap';

export function isSnapDisabled(svg: SVGSVGElement): boolean {
  return svg.getAttribute(SNAP_ATTR) === 'off';
}

export const SNAP_DISTANCE_ATTR = 'data-sf-snap-distance';
const DEFAULT_SNAP_DISTANCE_PX = 20;

// How close, in screen pixels, a shape has to come to another before it snaps. The host can set it as a number on the svg.
export function snapDistancePx(svg: SVGSVGElement): number {
  const value = Number(svg.getAttribute(SNAP_DISTANCE_ATTR));
  return value > 0 ? value : DEFAULT_SNAP_DISTANCE_PX;
}

const ISOMETRIC_GRID =/^isometric:(\d+(?:\.\d+)?)$/;

export function readIsometricSnapStep(svg: SVGSVGElement): number | null {
  const match = ISOMETRIC_GRID.exec(svg.getAttribute(SNAP_GRID_ATTR) ?? '');
  const step = match ? Number(match[1]) : 0;
  return step > 0 ? step : null;
}

export function nearestIsometricLatticePoint(point: { x: number; y: number }, step: number): { x: number; y: number } {
  const u = point.x / (AXIS_COS * step);
  const v = point.y / (AXIS_SIN * step);
  const i = Math.round((u + v) / 2);
  const j = Math.round((u - v) / 2);
  return { x: (i + j) * AXIS_COS * step, y: (i - j) * AXIS_SIN * step };
}

export function snapToStep(value: number, step: number, min: number): number {
  return Math.max(min, Math.round(value / step) * step);
}
