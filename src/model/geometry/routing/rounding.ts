export function roundOrthogonalPath(pts: number[], radius: number): number[] {
  if (pts.length < 6) return pts;

  const out: number[] = [];
  const n = pts.length / 2 - 1;

  out.push(pts[0], pts[1]);

  const SAMPLES = 8;

  for (let i = 1; i < n; i++) {
    const xPrev = pts[(i - 1) * 2];
    const yPrev = pts[(i - 1) * 2 + 1];
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    const xNext = pts[(i + 1) * 2];
    const yNext = pts[(i + 1) * 2 + 1];

    const dx1 = x - xPrev;
    const dy1 = y - yPrev;
    const dx2 = xNext - x;
    const dy2 = yNext - y;

    const isAxis1 = dx1 === 0 || dy1 === 0;
    const isAxis2 = dx2 === 0 || dy2 === 0;
    const isStraight = (dx1 === 0 && dx2 === 0) || (dy1 === 0 && dy2 === 0);

    if (!isAxis1 || !isAxis2 || isStraight) {
      out.push(x, y);
      continue;
    }

    const len1 = Math.abs(dx1) + Math.abs(dy1);
    const len2 = Math.abs(dx2) + Math.abs(dy2);

    const r = Math.min(radius, len1 * 0.4, len2 * 0.4);
    if (r <= 0) {
      out.push(x, y);
      continue;
    }

    const v1x = dx1 !== 0 ? Math.sign(dx1) : 0;
    const v1y = dy1 !== 0 ? Math.sign(dy1) : 0;
    const v2x = dx2 !== 0 ? Math.sign(dx2) : 0;
    const v2y = dy2 !== 0 ? Math.sign(dy2) : 0;

    const p1x = x - v1x * r;
    const p1y = y - v1y * r;

    const p2x = x + v2x * r;
    const p2y = y + v2y * r;

    const cx = x - v1x * r + v2x * r;
    const cy = y - v1y * r + v2y * r;

    const a1 = Math.atan2(p1y - cy, p1x - cx);
    const a2 = Math.atan2(p2y - cy, p2x - cx);

    const startAngle = a1;
    let endAngle = a2;

    let diff = endAngle - startAngle;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    endAngle = startAngle + diff;

    out.push(p1x, p1y);

    for (let j = 1; j < SAMPLES - 1; j++) {
      const t = j / (SAMPLES - 1);
      const ang = startAngle + diff * t;
      const qx = cx + Math.cos(ang) * r;
      const qy = cy + Math.sin(ang) * r;
      out.push(qx, qy);
    }

    out.push(p2x, p2y);
  }

  out.push(pts[pts.length - 2], pts[pts.length - 1]);

  return out;
}
