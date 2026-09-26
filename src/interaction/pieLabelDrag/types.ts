import type { OwnerRef } from '../../viewer';

export interface PieLabelDragState {
  owner: OwnerRef;
  pointerId: number;
  seriesId: string;
  centerX: number;
  centerY: number;
  outerRadius: number;
  startX: number;
  startY: number;
  moved: boolean;
  pulled: boolean;
  labelElement: SVGGraphicsElement;
}
