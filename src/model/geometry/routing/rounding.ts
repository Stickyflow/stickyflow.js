/**
 * Round 90° corners in orthogonal polyline with circular arcs
 * Approximate each corner with small arc segments for smooth visual appearance
 *
 * @param pts - Original orthogonal path [x0,y0, x1,y1, ...]
 * @param radius - Corner radius in pixels (8-12px recommended)
 * @returns New path with rounded corners
 */
export function roundOrthogonalPath(pts: number[], radius: number): number[] {
  if (pts.length < 6) return pts; // Less than 2 segments -> nothing to round

  const out: number[] = [];
  const n = pts.length / 2 - 1; // Number of segments

  // First point unchanged
  out.push(pts[0], pts[1]);

  const SAMPLES = 8; // Points on quarter circle (higher = smoother, 8 is sweet spot)

  for (let i = 1; i < n; i++) {
    const xPrev = pts[(i - 1) * 2];
    const yPrev = pts[(i - 1) * 2 + 1];
    const x     = pts[i * 2];
    const y     = pts[i * 2 + 1];
    const xNext = pts[(i + 1) * 2];
    const yNext = pts[(i + 1) * 2 + 1];

    const dx1 = x - xPrev;
    const dy1 = y - yPrev;
    const dx2 = xNext - x;
    const dy2 = yNext - y;

    // Only process true 90° corners (axis-aligned orthogonal segments)
    const isAxis1 = dx1 === 0 || dy1 === 0;
    const isAxis2 = dx2 === 0 || dy2 === 0;
    const isStraight = (dx1 === 0 && dx2 === 0) || (dy1 === 0 && dy2 === 0);

    if (!isAxis1 || !isAxis2 || isStraight) {
      // Not a corner -> keep original point
      out.push(x, y);
      continue;
    }

    // Segment lengths (Manhattan distance)
    const len1 = Math.abs(dx1) + Math.abs(dy1);
    const len2 = Math.abs(dx2) + Math.abs(dy2);

    // Effective radius limited to 40% of adjacent segment lengths
    const r = Math.min(radius, len1 * 0.4, len2 * 0.4);
    if (r <= 0) {
      out.push(x, y);
      continue;
    }

    // Direction vectors (normalized, orthogonal -> ±1 or 0)
    const v1x = dx1 !== 0 ? Math.sign(dx1) : 0;
    const v1y = dy1 !== 0 ? Math.sign(dy1) : 0;
    const v2x = dx2 !== 0 ? Math.sign(dx2) : 0;
    const v2y = dy2 !== 0 ? Math.sign(dy2) : 0;

    // Point on first segment, r before corner
    const p1x = x - v1x * r;
    const p1y = y - v1y * r;

    // Point on second segment, r after corner
    const p2x = x + v2x * r;
    const p2y = y + v2y * r;

    // Circle center for quarter arc
    const cx = x - v1x * r + v2x * r;
    const cy = y - v1y * r + v2y * r;

    // Start/end angles
    const a1 = Math.atan2(p1y - cy, p1x - cx);
    const a2 = Math.atan2(p2y - cy, p2x - cx);

    let startAngle = a1;
    let endAngle = a2;

    // Ensure we take the shorter 90° arc
    let diff = endAngle - startAngle;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    endAngle = startAngle + diff;

    // 1) Point before corner (where rounding starts)
    out.push(p1x, p1y);

    // 2) Intermediate points on quarter circle (smooth arc)
    for (let j = 1; j < SAMPLES - 1; j++) {
      const t = j / (SAMPLES - 1); // 0..1
      const ang = startAngle + diff * t;
      const qx = cx + Math.cos(ang) * r;
      const qy = cy + Math.sin(ang) * r;
      out.push(qx, qy);
    }

    // 3) Point after corner (start of next segment)
    out.push(p2x, p2y);
  }

  // Last point unchanged
  out.push(pts[pts.length - 2], pts[pts.length - 1]);

  return out;
}

/** Get the center point of bounds */

