import type { OwnerRef } from '../../viewer';

export interface PieLabelDragState {
  owner: OwnerRef;
  pointerId: number;
  seriesId: string;
  centerX: number;
  centerY: number;
  outerRadius: number;
  anchorX: number;
  anchorY: number;
  tickStartX: number;
  tickStartY: number;
  restX: number;
  restY: number;
  startX: number;
  startY: number;
  halfWidth: number;
  halfHeight: number;
  moved: boolean;
  lastDx: number;
  lastDy: number;
  labelElements: SVGGraphicsElement[];
  tickElement: SVGGraphicsElement | null;
  tickOriginalD: string | null;
  tickOriginalStroke: string | null;
  tickOriginalStrokeWidth: string | null;
}
