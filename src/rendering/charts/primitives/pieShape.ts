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

interface PieSliceArc {
  outerStart: PiePoint;
  outerEnd: PiePoint;
  innerEnd: PiePoint;
  innerStart: PiePoint;
  largeArc: number;
}

function createPieSliceArc(geometry: PieGeometry, angles: PieSliceAngles): PieSliceArc {
  return {
    outerStart: pieArcPoint(geometry, angles.start, geometry.outerRadius),
    outerEnd: pieArcPoint(geometry, angles.end, geometry.outerRadius),
    innerEnd: pieArcPoint(geometry, angles.end, geometry.innerRadius),
    innerStart: pieArcPoint(geometry, angles.start, geometry.innerRadius),
    largeArc: angles.end - angles.start > Math.PI ? 1 : 0,
  };
}

function createDonutSlicePath(geometry: PieGeometry, arc: PieSliceArc): string {
  return [
    `M ${arc.outerStart.x} ${arc.outerStart.y}`,
    `A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${arc.largeArc} 1 ${arc.outerEnd.x} ${arc.outerEnd.y}`,
    `L ${arc.innerEnd.x} ${arc.innerEnd.y}`,
    `A ${geometry.innerRadius} ${geometry.innerRadius} 0 ${arc.largeArc} 0 ${arc.innerStart.x} ${arc.innerStart.y}`,
    'Z',
  ].join(' ');
}

function plainPieSlicePath(geometry: PieGeometry, arc: PieSliceArc): string {
  return [
    `M ${geometry.centerX} ${geometry.centerY}`,
    `L ${arc.outerStart.x} ${arc.outerStart.y}`,
    `A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${arc.largeArc} 1 ${arc.outerEnd.x} ${arc.outerEnd.y}`,
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

function roundedPieSlicePath(geometry: PieGeometry, angles: PieSliceAngles, cornerRadius: number): string {
  const { centerX, centerY, outerRadius, innerRadius } = geometry;
  const outerFilletCenterRadius = outerRadius - cornerRadius;
  const outerStart = pieFillet(geometry, outerRadius, outerFilletCenterRadius, angles.start, cornerRadius, 1);
  const outerEnd = pieFillet(geometry, outerRadius, outerFilletCenterRadius, angles.end, cornerRadius, -1);
  const outerLargeArc = Math.abs(outerEnd.angle - outerStart.angle) > Math.PI ? 1 : 0;

  if (innerRadius <= 0) {
    return [
      `M ${centerX} ${centerY}`,
      `L ${outerStart.lineTangent.x} ${outerStart.lineTangent.y}`,
      `A ${cornerRadius} ${cornerRadius} 0 0 1 ${outerStart.arcTangent.x} ${outerStart.arcTangent.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${outerLargeArc} 1 ${outerEnd.arcTangent.x} ${outerEnd.arcTangent.y}`,
      `A ${cornerRadius} ${cornerRadius} 0 0 1 ${outerEnd.lineTangent.x} ${outerEnd.lineTangent.y}`,
      'Z',
    ].join(' ');
  }

  const innerFilletCenterRadius = innerRadius + cornerRadius;
  const innerStart = pieFillet(geometry, innerRadius, innerFilletCenterRadius, angles.start, cornerRadius, 1);
  const innerEnd = pieFillet(geometry, innerRadius, innerFilletCenterRadius, angles.end, cornerRadius, -1);
  const innerLargeArc = Math.abs(innerEnd.angle - innerStart.angle) > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.lineTangent.x} ${outerStart.lineTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${outerStart.arcTangent.x} ${outerStart.arcTangent.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${outerLargeArc} 1 ${outerEnd.arcTangent.x} ${outerEnd.arcTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${outerEnd.lineTangent.x} ${outerEnd.lineTangent.y}`,
    `L ${innerEnd.lineTangent.x} ${innerEnd.lineTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${innerEnd.arcTangent.x} ${innerEnd.arcTangent.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${innerLargeArc} 0 ${innerStart.arcTangent.x} ${innerStart.arcTangent.y}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${innerStart.lineTangent.x} ${innerStart.lineTangent.y}`,
    'Z',
  ].join(' ');
}

export function createPieSlicePath(geometry: PieGeometry, angles: PieSliceAngles, cornerRadius = 0): string {
  if (cornerRadius > 0) {
    return roundedPieSlicePath(geometry, angles, cornerRadius);
  }
  const arc = createPieSliceArc(geometry, angles);
  return geometry.innerRadius > 0 ? createDonutSlicePath(geometry, arc) : plainPieSlicePath(geometry, arc);
}
