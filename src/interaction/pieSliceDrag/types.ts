import type { OwnerRef } from '../../viewer';
import type { PieBoundaryDrag, PieBoundaryValue } from './boundary';

export interface PieSliceDragState {
  owner: OwnerRef;
  pointerId: number;
  moved: boolean;
  centerX: number;
  centerY: number;
  boundary: PieBoundaryDrag;
  lastSplit: PieBoundaryValue | null;
  beforeElement: SVGGraphicsElement;
  afterElement: SVGGraphicsElement;
  outerRadius: number;
  innerRadius: number;
  cornerRadius: number;
  total: number;
}
