import { AXIS_COS, AXIS_SIN } from '../../../model/isometricObject';
import type { GuideLine } from '../../dom';

export interface IsometricApexCandidate {
  apex: { x: number; y: number };
}

export interface IsometricDiagonalSnap {
  dx: number;
  dy: number;
  guide: GuideLine;
}

const AXES: ReadonlyArray<{ x: number; y: number }> = [
  { x: AXIS_COS, y: AXIS_SIN },
  { x: -AXIS_COS, y: AXIS_SIN },
];

const GUIDE_OVERHANG = 40;

export function snapIsometricDiagonal(
  apex: { x: number; y: number },
  rawDx: number,
  rawDy: number,
  candidates: readonly IsometricApexCandidate[],
  threshold: number,
): IsometricDiagonalSnap | null {
  const moved = { x: apex.x + rawDx, y: apex.y + rawDy };
  let best: { distance: number; corrected: { x: number; y: number }; guide: GuideLine } | null = null;

  for (const candidate of candidates) {
    for (const dir of AXES) {
      const rel = { x: moved.x - candidate.apex.x, y: moved.y - candidate.apex.y };
      const along = rel.x * dir.x + rel.y * dir.y;
      const perpX = rel.x - along * dir.x;
      const perpY = rel.y - along * dir.y;
      const distance = Math.hypot(perpX, perpY);
      if (distance < threshold && (!best || distance < best.distance)) {
        const corrected = { x: moved.x - perpX, y: moved.y - perpY };
        const from = { x: candidate.apex.x - dir.x * GUIDE_OVERHANG, y: candidate.apex.y - dir.y * GUIDE_OVERHANG };
        const to = { x: corrected.x + dir.x * GUIDE_OVERHANG, y: corrected.y + dir.y * GUIDE_OVERHANG };
        best = {
          distance,
          corrected,
          guide: { orientation: 'segment', x1: from.x, y1: from.y, x2: to.x, y2: to.y },
        };
      }
    }
  }

  if (!best) {
    return null;
  }
  return { dx: rawDx + (best.corrected.x - moved.x), dy: rawDy + (best.corrected.y - moved.y), guide: best.guide };
}
