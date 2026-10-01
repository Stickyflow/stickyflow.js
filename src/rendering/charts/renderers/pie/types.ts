import type { PieGeometry as BasePieGeometry } from '../../primitives/pieShape';

export type { PiePoint, PieSliceAngles } from '../../primitives/pieShape';

export interface PieGeometry extends BasePieGeometry {
  total: number;
  cornerRadius: number;
}
