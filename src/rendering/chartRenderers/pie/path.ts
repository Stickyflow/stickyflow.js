import { pieArcPoint } from './geometry';
import type { PieGeometry, PiePoint, PieSliceAngles } from './types';

interface PieSliceArc {
  outerStart: PiePoint;
  outerEnd: PiePoint;
  innerEnd: PiePoint;
  innerStart: PiePoint;
  largeArc: number;
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
