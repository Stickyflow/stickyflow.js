const TWO_PI = Math.PI * 2;
const CLAMP_MARGIN = 1e-4;

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

function normalizeNear(angle: number, start: number, end: number): number {
  let result = angle;
  while (result < start - Math.PI) {
    result += TWO_PI;
  }
  while (result > end + Math.PI) {
    result -= TWO_PI;
  }
  return result;
}

export function resolvePieBoundary(
  slices: readonly PieSliceInfo[],
  clickedIndex: number,
  pointerAngle: number,
): PieBoundaryDrag | null {
  const n = slices.length;
  if (n < 2 || clickedIndex < 0 || clickedIndex >= n) {
    return null;
  }
  const clicked = slices[clickedIndex];
  const angle = normalizeNear(pointerAngle, clicked.start, clicked.end);
  const activeIsStart = Math.abs(angle - clicked.start) <= Math.abs(angle - clicked.end);

  if (activeIsStart) {
    const neighborIndex = (clickedIndex - 1 + n) % n;
    const neighbor = slices[neighborIndex];
    const shift = neighborIndex > clickedIndex ? -TWO_PI : 0;
    return {
      before: { seriesId: neighbor.seriesId, value: neighbor.value },
      after: { seriesId: clicked.seriesId, value: clicked.value },
      arcStart: neighbor.start + shift,
      arcEnd: clicked.end,
      combinedValue: neighbor.value + clicked.value,
    };
  }

  const neighborIndex = (clickedIndex + 1) % n;
  const neighbor = slices[neighborIndex];
  const shift = neighborIndex < clickedIndex ? TWO_PI : 0;
  return {
    before: { seriesId: clicked.seriesId, value: clicked.value },
    after: { seriesId: neighbor.seriesId, value: neighbor.value },
    arcStart: clicked.start,
    arcEnd: neighbor.end + shift,
    combinedValue: clicked.value + neighbor.value,
  };
}

export function pieBoundaryValueAt(drag: PieBoundaryDrag, pointerAngle: number): PieBoundaryValue {
  const angle = normalizeNear(pointerAngle, drag.arcStart, drag.arcEnd);
  const boundary = Math.min(Math.max(angle, drag.arcStart + CLAMP_MARGIN), drag.arcEnd - CLAMP_MARGIN);
  const beforeValue = drag.combinedValue * ((boundary - drag.arcStart) / (drag.arcEnd - drag.arcStart));
  return { beforeValue, afterValue: drag.combinedValue - beforeValue, boundary };
}
