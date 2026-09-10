import type { RadarFrame } from '../../rendering/charts/primitives/radarShape';
import type { OwnerRef } from '../../viewer';

export interface RadarVertexDragState {
  owner: OwnerRef;
  series: string;
  index: number;
  pointerId: number;
  moved: boolean;
  frame: RadarFrame;
  element: SVGGraphicsElement;
  lastValue: number | null;
}
