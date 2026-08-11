// src/rendering/isolines.ts
// Fields §3.4: contour lines traced through the interpolated field grid
// (see field.ts's computeFieldGrid) via marching squares - ported verbatim
// from stickyflow-atlas's entities/charts/ui/isolines.ts (no ambiguous-case
// saddle resolution: at this grid's resolution the visual difference is
// negligible, and adding it would double the branch count for a case that
// rarely occurs with real-world sample data).

export interface IsolineSegment { x1: number; y1: number; x2: number; y2: number }

function lerpEdge(x1: number, y1: number, v1: number, x2: number, y2: number, v2: number, threshold: number): [number, number] {
  const t = v2 === v1 ? 0.5 : (threshold - v1) / (v2 - v1);
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

/** Marching squares over a row-major `grid` (as produced by computeFieldGrid)
 * spanning pixel rect [0, width] x [0, height] - returns every line segment
 * crossing `threshold`, disconnected (not stitched into polylines). At this
 * grid's resolution that reads as continuous contours once drawn together. */
export function computeIsolineSegments(
  grid: Float32Array, cols: number, rows: number, width: number, height: number, threshold: number,
): IsolineSegment[] {
  const segments: IsolineSegment[] = [];
  const px = (col: number) => width * (col / (cols - 1));
  const py = (row: number) => height * (row / (rows - 1));
  const above = (col: number, row: number) => grid[row * cols + col] >= threshold;

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const tl = { x: px(col), y: py(row), v: grid[row * cols + col] };
      const tr = { x: px(col + 1), y: py(row), v: grid[row * cols + col + 1] };
      const br = { x: px(col + 1), y: py(row + 1), v: grid[(row + 1) * cols + col + 1] };
      const bl = { x: px(col), y: py(row + 1), v: grid[(row + 1) * cols + col] };
      const caseIndex = (above(col, row) ? 8 : 0) | (above(col + 1, row) ? 4 : 0) | (above(col + 1, row + 1) ? 2 : 0) | (above(col, row + 1) ? 1 : 0);
      if (caseIndex === 0 || caseIndex === 15) continue;

      const top = () => lerpEdge(tl.x, tl.y, tl.v, tr.x, tr.y, tr.v, threshold);
      const right = () => lerpEdge(tr.x, tr.y, tr.v, br.x, br.y, br.v, threshold);
      const bottom = () => lerpEdge(bl.x, bl.y, bl.v, br.x, br.y, br.v, threshold);
      const left = () => lerpEdge(tl.x, tl.y, tl.v, bl.x, bl.y, bl.v, threshold);
      const seg = (a: [number, number], b: [number, number]) => segments.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });

      switch (caseIndex) {
        case 1: case 14: seg(left(), bottom()); break;
        case 2: case 13: seg(bottom(), right()); break;
        case 3: case 12: seg(left(), right()); break;
        case 4: case 11: seg(top(), right()); break;
        case 5: seg(left(), top()); seg(bottom(), right()); break;
        case 6: case 9: seg(top(), bottom()); break;
        case 7: case 8: seg(left(), top()); break;
        case 10: seg(top(), right()); seg(left(), bottom()); break;
      }
    }
  }
  return segments;
}
