import type { OwnerRef } from '../../viewer';
import type { PieBoundaryDrag } from './boundary';

export interface PieSliceDragState {
  owner: OwnerRef;
  pointerId: number;
  moved: boolean;
  centerX: number;
  centerY: number;
  boundary: PieBoundaryDrag;
  beforeElement: SVGGraphicsElement;
  afterElement: SVGGraphicsElement;
  outerRadius: number;
  innerRadius: number;
  total: number;
}
