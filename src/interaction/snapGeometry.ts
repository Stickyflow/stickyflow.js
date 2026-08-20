// Alignment-guide snap math for both move and resize — pure, no DOM (same
// tier as patchSfl.ts, runs fine under plain Node/vitest). One shared
// comparison function used by both moveDrag.ts and resizeDrag.ts, rather
// than two separate near-duplicate implementations (the shape this feature
// takes in stickyflow-atlas, the app this behavior is ported from — one for
// drag, one for resize, differing only in which edges/centers participate).
//
// Behavior ported from stickyflow-atlas's dragService.ts (move) and
// scaleSnapping.ts (resize): per axis, compare the dragged bounds' active
// edge/center points against every candidate's min/center/max; the single
// closest match under threshold wins (only one guide line per axis at a
// time), hard-snapped (no easing).
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
  /** World-space snap distance. */
  threshold: number;
  /** Which of `bounds`' own points participate on the X axis — empty means
   *  the axis is never snapped (e.g. a resize handle that doesn't touch X). */
  activeX: EdgePoint[];
  activeY: EdgePoint[];
  /** World-space padding added past the min/max of bounds+matched target
   *  when drawing the guide line's extent. */
  guideOverhang: number;
}

function pointsOf(min: number, size: number): Record<EdgePoint, number> {
  return { min, center: min + size / 2, max: min + size };
}

/** Finds, per axis, the single closest-under-threshold alignment between
 *  `bounds`' active points and any candidate's min/center/max. */
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

/** Perf guard, not a spatial index — matches the reference implementation's
 *  own "nearest 50 by center distance" cap. */
export function nearestCandidates(bounds: Bounds, all: Bounds[], limit = 50): Bounds[] {
  const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
  return [...all]
    .sort((a, b) => {
      const da = Math.hypot(a.x + a.width / 2 - cx, a.y + a.height / 2 - cy);
      const db = Math.hypot(b.x + b.width / 2 - cx, b.y + b.height / 2 - cy);
      return da - db;
    })
    .slice(0, limit);
}

/** Move: every point on both axes is active — the whole bbox can align to
 *  anything. */
export const MOVE_ACTIVE_POINTS: EdgePoint[] = ['min', 'center', 'max'];

/** Resize: only the ONE point the grabbed handle's axis actually controls —
 *  a 'left'/'top'-moving edge is the bounds' own 'min' point on that axis, a
 *  'right'/'bottom'-moving edge is 'max'. 'none' means the axis isn't
 *  resized by this handle at all, so nothing snaps on it. */
export function resizeActivePoints(axisMove: 'left' | 'right' | 'top' | 'bottom' | 'none'): EdgePoint[] {
  if (axisMove === 'none') return [];
  return axisMove === 'left' || axisMove === 'top' ? ['min'] : ['max'];
}

/** Folds a computed axis snap delta back into proposed resize bounds,
 *  respecting which edge is fixed vs. moving (mirrors resizeDrag.ts's
 *  HANDLE_AXES semantics): a 'left'-moving edge shifts x AND shrinks/grows
 *  width oppositely; a 'right'-moving edge only changes width. Result is
 *  clamped to `minSize` same as an unsnapped resize would be. */
export function applyAxisSnap(
  bounds: Bounds,
  moveX: 'left' | 'right' | 'none',
  moveY: 'top' | 'bottom' | 'none',
  snap: SnapResult,
  minSize: number,
): Bounds {
  let { x, y, width, height } = bounds;
  if (moveX === 'left' && snap.x.delta) { x += snap.x.delta; width -= snap.x.delta; }
  else if (moveX === 'right' && snap.x.delta) { width += snap.x.delta; }
  if (moveY === 'top' && snap.y.delta) { y += snap.y.delta; height -= snap.y.delta; }
  else if (moveY === 'bottom' && snap.y.delta) { height += snap.y.delta; }
  return { x, y, width: Math.max(minSize, width), height: Math.max(minSize, height) };
}
