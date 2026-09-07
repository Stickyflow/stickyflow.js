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
  // A bar is a path (see barShapePath), not a rect : it has no x/width/rx
  // attributes to read back mid-drag, so its resting geometry is captured
  // once here instead, from getBBox() at drag start.
  barX: number;
  barWidth: number;
  barRadius: number;
  pointerId: number;
  moved: boolean;
}
