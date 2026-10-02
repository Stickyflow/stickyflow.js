import type { Rect } from '../../../model/geometry/types';
import type { OwnerRef } from '../../viewer';
import type { LiveLink } from '../linkPreview';

export interface TransformedNodes {
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
}

export interface DraggedCanvasObject extends TransformedNodes {
  owner: OwnerRef;
  overlays: SVGGElement[];
  overlayBaseTransforms: (string | null)[];
  draggedBounds: Rect;
  liveLinks: LiveLink[];
  containerBounds?: Rect;
}

export interface MoveDragState {
  canvasObjects: DraggedCanvasObject[];
  internalLinks: TransformedNodes[];
  pointerId: number;
  startScreen: { x: number; y: number };
  startUser: { x: number; y: number };
  moved: boolean;
}
