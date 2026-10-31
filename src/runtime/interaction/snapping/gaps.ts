import type { Rect } from '../../../model/geometry/types';
import type { GuideLine } from '../../dom';

type Axis = 'x' | 'y';

export interface GapSnap {
  delta: number;
  guides: GuideLine[];
}

interface Span {
  start: number;
  end: number;
  cross: number;
}

// The objects that lie in one row with the moved one on this axis, in order. An object in the row overlaps it across the axis.
function rowOf(bounds: Rect, candidates: Rect[], axis: Axis): Span[] {
  const [crossStart, crossSize] = axis === 'x' ? (['y', 'height'] as const) : (['x', 'width'] as const);
  const [start, size] = axis === 'x' ? (['x', 'width'] as const) : (['y', 'height'] as const);
  return candidates
    .filter(
      candidate =>
        candidate[crossStart] < bounds[crossStart] + bounds[crossSize] &&
        bounds[crossStart] < candidate[crossStart] + candidate[crossSize],
    )
    .map(candidate => ({
      start: candidate[start],
      end: candidate[start] + candidate[size],
      cross: candidate[crossStart] + candidate[crossSize] / 2,
    }))
    .sort((first, second) => first.start - second.start);
}

function segment(axis: Axis, from: number, to: number, cross: number): GuideLine {
  return axis === 'x'
    ? { orientation: 'segment', x1: from, y1: cross, x2: to, y2: cross }
    : { orientation: 'segment', x1: cross, y1: from, x2: cross, y2: to };
}

function axisGapSnap(bounds: Rect, candidates: Rect[], axis: Axis, threshold: number): GapSnap | null {
  const row = rowOf(bounds, candidates, axis);
  const start = axis === 'x' ? bounds.x : bounds.y;
  const size = axis === 'x' ? bounds.width : bounds.height;
  const center = start + size / 2;
  const before = row.filter(span => (span.start + span.end) / 2 < center).at(-1);
  const after = row.find(span => (span.start + span.end) / 2 >= center);
  const pairs = row
    .slice(1)
    .map((span, index) => ({ first: row[index], second: span, gap: span.start - row[index].end }));

  let best: GapSnap | null = null;
  const consider = (target: number, guides: GuideLine[]) => {
    const delta = target - start;
    if (Math.abs(delta) < threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
      best = { delta, guides };
    }
  };

  // Halfway between its two neighbors.
  if (before && after) {
    const target = (before.end + after.start - size) / 2;
    if (target >= before.end) {
      consider(target, [
        segment(axis, before.end, target, before.cross),
        segment(axis, target + size, after.start, after.cross),
      ]);
    }
  }
  // As far from a neighbor as two other objects of the row are from each other.
  for (const { first, second, gap } of pairs) {
    if (gap <= 0) {
      continue;
    }
    const existing = segment(axis, first.end, second.start, first.cross);
    if (before) {
      consider(before.end + gap, [existing, segment(axis, before.end, before.end + gap, before.cross)]);
    }
    if (after) {
      consider(after.start - gap - size, [existing, segment(axis, after.start - gap, after.start, after.cross)]);
    }
  }
  return best;
}

export function computeGapSnap(
  bounds: Rect,
  candidates: Rect[],
  threshold: number,
): { x: GapSnap | null; y: GapSnap | null } {
  return {
    x: axisGapSnap(bounds, candidates, 'x', threshold),
    y: axisGapSnap(bounds, candidates, 'y', threshold),
  };
}
