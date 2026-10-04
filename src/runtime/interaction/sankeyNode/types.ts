import type { OwnerRef } from '../../viewer';

// One ribbon touching the dragged node, captured once at drag start so the
// live preview can redraw it every pointermove without re-reading the DOM -
// only the end attached to the dragged node moves; the other end (and the
// element's original `d`, kept for a clean revert on drop) stays fixed.
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
  links: SankeyNodeDragLink[];
  moved: boolean;
  lastDx: number;
  lastDy: number;
}
