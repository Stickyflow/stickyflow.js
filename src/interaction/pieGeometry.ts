import { findOwnerNode, isPrimary } from '../domContract';

export interface ParsedPieGeometry {
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
}

export function readPieGeometry(svg: SVGSVGElement, ownerId: string): ParsedPieGeometry | null {
  const raw = findOwnerNode(svg, ownerId, isPrimary)?.getAttribute('data-sf-pie-geometry');
  if (!raw) {
    return null;
  }
  const [centerX, centerY, outerRadius, innerRadius] = raw.split(',').map(Number);
  return [centerX, centerY, outerRadius, innerRadius].every(Number.isFinite)
    ? { centerX, centerY, outerRadius, innerRadius }
    : null;
}
