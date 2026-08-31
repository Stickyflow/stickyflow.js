import type { Bounds } from '../model/geometry/router';
import type { GuideLine } from '../viewer/alignmentGuideOverlay';

export type EdgePoint = 'min' | 'center' | 'max';
const TARGET_POINTS: EdgePoint[] = ['min', 'center', 'max'];

export interface AxisSnap {
  delta: number;
  guide: GuideLine | null;
}

export interface SnapResult {
  x: AxisSnap;
  y: AxisSnap;
}

export interface SnapConfig {
  threshold: number;
  activeX: EdgePoint[];
  activeY: EdgePoint[];
  guideOverhang: number;
}

function pointsOf(min: number, size: number): Record<EdgePoint, number> {
  return { min, center: min + size / 2, max: min + size };
}

export function computeSnap(bounds: Bounds, candidates: Bounds[], config: SnapConfig): SnapResult {
  const bx = pointsOf(bounds.x, bounds.width);
  const by = pointsOf(bounds.y, bounds.height);

  let bestX: { distance: number; delta: number; guide: GuideLine } | null = null;
  let bestY: { distance: number; delta: number; guide: GuideLine } | null = null;

  for (const target of candidates) {
    const tx = pointsOf(target.x, target.width);
    const ty = pointsOf(target.y, target.height);

    for (const sp of config.activeX) {
      for (const tp of TARGET_POINTS) {
        const distance = Math.abs(bx[sp] - tx[tp]);
        if (distance < config.threshold && (!bestX || distance < bestX.distance)) {
          bestX = {
            distance,
            delta: tx[tp] - bx[sp],
            guide: {
              orientation: 'vertical',
              position: tx[tp],
              from: Math.min(bounds.y, target.y) - config.guideOverhang,
              to: Math.max(bounds.y + bounds.height, target.y + target.height) + config.guideOverhang,
            },
          };
        }
      }
    }

    for (const sp of config.activeY) {
      for (const tp of TARGET_POINTS) {
        const distance = Math.abs(by[sp] - ty[tp]);
        if (distance < config.threshold && (!bestY || distance < bestY.distance)) {
          bestY = {
            distance,
            delta: ty[tp] - by[sp],
            guide: {
              orientation: 'horizontal',
              position: ty[tp],
              from: Math.min(bounds.x, target.x) - config.guideOverhang,
              to: Math.max(bounds.x + bounds.width, target.x + target.width) + config.guideOverhang,
            },
          };
        }
      }
    }
  }

  return {
    x: { delta: bestX?.delta ?? 0, guide: bestX?.guide ?? null },
    y: { delta: bestY?.delta ?? 0, guide: bestY?.guide ?? null },
  };
}

export function nearestCandidates(bounds: Bounds, all: Bounds[], limit = 50): Bounds[] {
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  return [...all]
    .sort((a, b) => {
      const da = Math.hypot(a.x + a.width / 2 - cx, a.y + a.height / 2 - cy);
      const db = Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy);
      return da - db;
    })
    .slice(0, limit);
}

export const MOVE_ACTIVE_POINTS: EdgePoint[] = ['min', 'center', 'max'];

export function resizeActivePoints(axisMove: 'left' | 'right' | 'top' | 'bottom' | 'none'): EdgePoint[] {
  if (axisMove === 'none') return [];
  return axisMove === 'left' || axisMove === 'top' ? ['min'] : ['max'];
}

export function applyAxisSnap(
  bounds: Bounds,
  moveX: 'left' | 'right' | 'none',
  moveY: 'top' | 'bottom' | 'none',
  snap: SnapResult,
  minSize: number,
): Bounds {
  let { x, y, width, height } = bounds;
  if (moveX === 'left' && snap.x.delta) {
    x += snap.x.delta;
    width -= snap.x.delta;
  } else if (moveX === 'right' && snap.x.delta) {
    width += snap.x.delta;
  }
  if (moveY === 'top' && snap.y.delta) {
    y += snap.y.delta;
    height -= snap.y.delta;
  } else if (moveY === 'bottom' && snap.y.delta) {
    height += snap.y.delta;
  }
  return { x, y, width: Math.max(minSize, width), height: Math.max(minSize, height) };
}
