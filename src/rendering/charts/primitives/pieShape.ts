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

export function createPieSlicePath(geometry: PieGeometry, angles: PieSliceAngles): string {
  const arc = createPieSliceArc(geometry, angles);
  if (geometry.innerRadius > 0) {
    return createDonutSlicePath(geometry, arc);
  }
  return [
    `M ${geometry.centerX} ${geometry.centerY}`,
    `L ${arc.outerStart.x} ${arc.outerStart.y}`,
    `A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${arc.largeArc} 1 ${arc.outerEnd.x} ${arc.outerEnd.y}`,
    'Z',
  ].join(' ');
}
