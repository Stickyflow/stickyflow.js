const TWO_PI = Math.PI * 2;

export interface PieSliceInfo {
  seriesId: string;
  start: number;
  end: number;
  value: number;
}

export interface PieBoundaryDrag {
  before: { seriesId: string; value: number };
  after: { seriesId: string; value: number };
  arcStart: number;
  arcEnd: number;
  combinedValue: number;
}

export interface PieBoundaryValue {
  beforeValue: number;
  afterValue: number;
  boundary: number;
}

export function resolvePieBoundary(slices: readonly PieSliceInfo[], clickedIndex: number): PieBoundaryDrag | null {
  const count = slices.length;
  if (count < 2 || clickedIndex < 0 || clickedIndex >= count) {
    return null;
  }
  const beforeIndex = clickedIndex === count - 1 ? clickedIndex - 1 : clickedIndex;
  const before = slices[beforeIndex];
  const after = slices[beforeIndex + 1];
  if (!(after.end > before.start)) {
    return null;
  }
  return {
    before: { seriesId: before.seriesId, value: before.value },
    after: { seriesId: after.seriesId, value: after.value },
    arcStart: before.start,
    arcEnd: after.end,
    combinedValue: before.value + after.value,
  };
}

export function initialPieBoundary(drag: PieBoundaryDrag): number {
  const span = drag.arcEnd - drag.arcStart;
  const share = drag.combinedValue > 0 ? drag.before.value / drag.combinedValue : 0;
  return drag.arcStart + span * share;
}

function nearestTurn(offset: number, previous: number): number {
  const candidates = [offset - TWO_PI, offset, offset + TWO_PI];
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - previous) < Math.abs(best - previous) ? candidate : best,
  );
}

export function pieBoundaryValueAt(
  drag: PieBoundaryDrag,
  pointerAngle: number,
  previousBoundary?: number,
): PieBoundaryValue {
  const span = drag.arcEnd - drag.arcStart;
  const previous = (previousBoundary ?? initialPieBoundary(drag)) - drag.arcStart;
  const offset = (pointerAngle - drag.arcStart) % TWO_PI;
  const unwrapped = nearestTurn(offset < 0 ? offset + TWO_PI : offset, previous);
  const swept = Math.min(Math.max(unwrapped, 0), span);
  const beforeValue = drag.combinedValue * (swept / span);
  return { beforeValue, afterValue: drag.combinedValue - beforeValue, boundary: drag.arcStart + swept };
}
