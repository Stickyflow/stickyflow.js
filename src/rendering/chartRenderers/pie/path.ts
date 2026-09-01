import { pieArcPoint } from './geometry';
import type { PieGeometry } from './types';

export function createPieSlicePath(geometry: PieGeometry, startAngle: number, endAngle: number): string {
  const outerStart = pieArcPoint(geometry, startAngle, geometry.outerRadius);
  const outerEnd = pieArcPoint(geometry, endAngle, geometry.outerRadius);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  if (geometry.innerRadius > 0) {
    return createDonutSlicePath(geometry, startAngle, endAngle, largeArc, outerStart, outerEnd);
  }
  return `M ${geometry.centerX} ${geometry.centerY} L ${outerStart.x} ${outerStart.y} A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
}

function createDonutSlicePath(
  geometry: PieGeometry,
  startAngle: number,
  endAngle: number,
  largeArc: number,
  outerStart: { x: number; y: number },
  outerEnd: { x: number; y: number },
): string {
  const innerEnd = pieArcPoint(geometry, endAngle, geometry.innerRadius);
  const innerStart = pieArcPoint(geometry, startAngle, geometry.innerRadius);
  return `M ${outerStart.x} ${outerStart.y} A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${geometry.innerRadius} ${geometry.innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
}
