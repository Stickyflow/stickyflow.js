export interface PiePoint {
  x: number;
  y: number;
}

export interface PieGeometry {
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
}

export function resolvePieRadii(
  plotWidth: number,
  plotHeight: number,
  configInnerRadius: number | undefined,
  configCornerRadius: number | undefined,
): { outerRadius: number; innerRadius: number; cornerRadius: number } {
  const rawOuterRadius = Math.max(1, Math.min(plotWidth, plotHeight) / 2 - 4);
  const rawInnerRadius = Math.max(0, Math.min(configInnerRadius ?? 0, rawOuterRadius - 1));
  const cornerRadius = Math.max(0, Math.min(configCornerRadius ?? 0, rawOuterRadius / 2));
  const outerRadius = Math.max(1, rawOuterRadius - cornerRadius);
  const innerRadius = rawInnerRadius > 0 ? Math.min(rawInnerRadius + cornerRadius, outerRadius - 1) : 0;
  return { outerRadius, innerRadius, cornerRadius };
}

export interface PieSliceAngles {
  start: number;
  end: number;
}

export function pieArcPoint(geometry: PieGeometry, angle: number, radius: number): PiePoint {
  return {
    x: geometry.centerX + radius * Math.cos(angle),
    y: geometry.centerY + radius * Math.sin(angle),
  };
}

export function clipSegmentToRect(from: PiePoint, to: PiePoint, halfWidth: number, halfHeight: number): PiePoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) > 1e-6) {
    const tx1 = (to.x - halfWidth - from.x) / dx;
    const tx2 = (to.x + halfWidth - from.x) / dx;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }
  if (Math.abs(dy) > 1e-6) {
    const ty1 = (to.y - halfHeight - from.y) / dy;
    const ty2 = (to.y + halfHeight - from.y) / dy;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }
  const t = tMin <= tMax ? tMin : 1;
  return { x: from.x + t * dx, y: from.y + t * dy };
}

function largeArcFlag(a: number, b: number): number {
  return Math.abs(b - a) > Math.PI ? 1 : 0;
}

export function gapInsetAngle(halfGap: number, radius: number): number {
  if (halfGap <= 0 || radius <= 0) {
    return 0;
  }
  return Math.asin(Math.min(1, halfGap / radius));
}

function insetAngles(angles: PieSliceAngles, inset: number): PieSliceAngles {
  return { start: angles.start + inset, end: angles.end - inset };
}

export function pieApexRadius(halfGap: number, sweep: number, outerRadius: number): number {
  if (halfGap <= 0) {
    return 0;
  }
  const halfSweep = Math.min(Math.abs(sweep) / 2, Math.PI / 2);
  const denominator = Math.sin(halfSweep);
  return denominator <= 1e-6 ? outerRadius : Math.min(halfGap / denominator, outerRadius);
}

function apexSlicePath(geometry: PieGeometry, outerAngles: PieSliceAngles, apex: PiePoint): string {
  const start = pieArcPoint(geometry, outerAngles.start, geometry.outerRadius);
  const end = pieArcPoint(geometry, outerAngles.end, geometry.outerRadius);
  return [
    `M ${apex.x} ${apex.y}`,
    `L ${start.x} ${start.y}`,
    `A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${largeArcFlag(outerAngles.start, outerAngles.end)} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function donutSlicePath(
  geometry: PieGeometry,
  innerRadius: number,
  outerAngles: PieSliceAngles,
  innerAngles: PieSliceAngles,
): string {
  const outerStart = pieArcPoint(geometry, outerAngles.start, geometry.outerRadius);
  const outerEnd = pieArcPoint(geometry, outerAngles.end, geometry.outerRadius);
  const innerEnd = pieArcPoint(geometry, innerAngles.end, innerRadius);
  const innerStart = pieArcPoint(geometry, innerAngles.start, innerRadius);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${largeArcFlag(outerAngles.start, outerAngles.end)} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag(innerAngles.start, innerAngles.end)} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

const CORNER_ANGLE_HEADROOM = 0.82;

interface PieFillet {
  lineTangent: PiePoint;
  arcTangent: PiePoint;
  angle: number;
}

function pieFillet(
  geometry: PieGeometry,
  circleRadius: number,
  filletCenterRadius: number,
  edgeAngle: number,
  cornerRadius: number,
  sign: 1 | -1,
): PieFillet {
  const ratio = Math.min(1, cornerRadius / filletCenterRadius);
  const angle = edgeAngle + sign * Math.asin(ratio);
  const d = Math.sqrt(Math.max(0, filletCenterRadius * filletCenterRadius - cornerRadius * cornerRadius));
  return {
    lineTangent: { x: geometry.centerX + d * Math.cos(edgeAngle), y: geometry.centerY + d * Math.sin(edgeAngle) },
    arcTangent: pieArcPoint(geometry, angle, circleRadius),
    angle,
  };
}

export function maxPieCornerRadius(outerRadius: number, innerRadius: number, sweep: number): number {
  const halfSweep = Math.min(Math.abs(sweep) / 2, Math.PI / 2);
  const angleFactor = Math.sin(halfSweep * CORNER_ANGLE_HEADROOM);
  const outerLimit = outerRadius * angleFactor;
  const innerLimit = innerRadius > 0 ? innerRadius * angleFactor : Number.POSITIVE_INFINITY;
  const ringLimit = innerRadius > 0 ? (outerRadius - innerRadius) / 2 : outerRadius / 2;
  return Math.max(0, Math.min(outerLimit, innerLimit, ringLimit));
}

export function maxApexCornerRadius(outerRadius: number, apexRadius: number, sweep: number): number {
  const halfSweep = Math.min(Math.abs(sweep) / 2, Math.PI / 2);
  const angleFactor = Math.sin(halfSweep * CORNER_ANGLE_HEADROOM);
  const outerLimit = outerRadius * angleFactor;
  const depthLimit = (outerRadius * outerRadius - apexRadius * apexRadius) / (2 * outerRadius);
  return Math.max(0, Math.min(outerLimit, depthLimit));
}

function roundedApexSlicePath(
  geometry: PieGeometry,
  outerAngles: PieSliceAngles,
  cornerRadius: number,
  apex: PiePoint,
): string {
  const { outerRadius } = geometry;
  const outerFilletCenterRadius = outerRadius - cornerRadius;
  const start = pieFillet(geometry, outerRadius, outerFilletCenterRadius, outerAngles.start, cornerRadius, 1);
  const end = pieFillet(geometry, outerRadius, outerFilletCenterRadius, outerAngles.end, cornerRadius, -1);
  return [
    `M ${apex.x} ${apex.y}`,
    `L ${start.lineTangent.x} ${start.lineTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${start.arcTangent.x} ${start.arcTangent.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag(start.angle, end.angle)} 1 ${end.arcTangent.x} ${end.arcTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${end.lineTangent.x} ${end.lineTangent.y}`,
    'Z',
  ].join(' ');
}

function roundedDonutSlicePath(
  geometry: PieGeometry,
  innerRadius: number,
  outerAngles: PieSliceAngles,
  innerAngles: PieSliceAngles,
  cornerRadius: number,
): string {
  const { outerRadius } = geometry;
  const outerFilletCenterRadius = outerRadius - cornerRadius;
  const outerStart = pieFillet(geometry, outerRadius, outerFilletCenterRadius, outerAngles.start, cornerRadius, 1);
  const outerEnd = pieFillet(geometry, outerRadius, outerFilletCenterRadius, outerAngles.end, cornerRadius, -1);

  const innerFilletCenterRadius = innerRadius + cornerRadius;
  const innerStart = pieFillet(geometry, innerRadius, innerFilletCenterRadius, innerAngles.start, cornerRadius, 1);
  const innerEnd = pieFillet(geometry, innerRadius, innerFilletCenterRadius, innerAngles.end, cornerRadius, -1);

  return [
    `M ${outerStart.lineTangent.x} ${outerStart.lineTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${outerStart.arcTangent.x} ${outerStart.arcTangent.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag(outerStart.angle, outerEnd.angle)} 1 ${outerEnd.arcTangent.x} ${outerEnd.arcTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${outerEnd.lineTangent.x} ${outerEnd.lineTangent.y}`,
    `L ${innerEnd.lineTangent.x} ${innerEnd.lineTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${innerEnd.arcTangent.x} ${innerEnd.arcTangent.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag(innerEnd.angle, innerStart.angle)} 0 ${innerStart.arcTangent.x} ${innerStart.arcTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${innerStart.lineTangent.x} ${innerStart.lineTangent.y}`,
    'Z',
  ].join(' ');
}

export function pieUsesInnerArc(geometry: PieGeometry, angles: PieSliceAngles, gapPx: number): boolean {
  const halfGap = Math.max(0, gapPx) / 2;
  const apexRadius = pieApexRadius(halfGap, angles.end - angles.start, geometry.outerRadius);
  return geometry.innerRadius > 0 && geometry.innerRadius >= apexRadius;
}

export function createPieSlicePath(geometry: PieGeometry, angles: PieSliceAngles, cornerRadius = 0, gapPx = 0): string {
  const halfGap = Math.max(0, gapPx) / 2;
  const outerAngles = insetAngles(angles, gapInsetAngle(halfGap, geometry.outerRadius));

  if (!pieUsesInnerArc(geometry, angles, gapPx)) {
    const apexRadius = pieApexRadius(halfGap, angles.end - angles.start, geometry.outerRadius);
    const apex = pieArcPoint(geometry, (angles.start + angles.end) / 2, apexRadius);
    return cornerRadius > 0
      ? roundedApexSlicePath(geometry, outerAngles, cornerRadius, apex)
      : apexSlicePath(geometry, outerAngles, apex);
  }

  const innerAngles = insetAngles(angles, gapInsetAngle(halfGap, geometry.innerRadius));
  return cornerRadius > 0
    ? roundedDonutSlicePath(geometry, geometry.innerRadius, outerAngles, innerAngles, cornerRadius)
    : donutSlicePath(geometry, geometry.innerRadius, outerAngles, innerAngles);
}
