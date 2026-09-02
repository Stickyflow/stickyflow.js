import type { OwnerRef } from '../../viewer';

export interface ValueScale {
  plotY: number;
  plotHeight: number;
  min: number;
  max: number;
}

export interface ChartValueDragState {
  owner: OwnerRef;
  series: string;
  index: number;
  scale: ValueScale;
  element: SVGGraphicsElement;
  baseY: number;
  isBar: boolean;
  pointerId: number;
  moved: boolean;
}
