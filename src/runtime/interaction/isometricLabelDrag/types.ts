import type { OwnerRef } from '../../dom';

export interface IsometricLabelDragState {
  owner: OwnerRef;
  pointerId: number;
  anchorX: number;
  anchorY: number;
  restX: number;
  restY: number;
  startX: number;
  startY: number;
  baseOffsetX: number;
  baseOffsetY: number;
  moved: boolean;
  lastDx: number;
  lastDy: number;
  labelElements: SVGGraphicsElement[];
  guideElement: SVGGraphicsElement | null;
  guideOriginalD: string | null;
}
