import type { Rect } from '../../../model/geometry/types';
import type { OwnerRef } from '../../viewer';

export interface SankeyNodeDragLink {
  element: SVGGraphicsElement;
  originalD: string;
  endsAtSource: boolean;
  sx: number;
  sTop: number;
  sBottom: number;
  tx: number;
  tTop: number;
  tBottom: number;
}

export interface SankeyNodeDragState {
  owner: OwnerRef;
  pointerId: number;
  nodeId: string;
  rect: SVGGraphicsElement;
  label: SVGGraphicsElement | null;
  startX: number;
  startY: number;
  originalBounds: Rect;
  siblingBounds: Rect[];
  links: SankeyNodeDragLink[];
  moved: boolean;
  lastDx: number;
  lastDy: number;
}
