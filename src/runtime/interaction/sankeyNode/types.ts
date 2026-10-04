import type { OwnerRef } from '../../viewer';

export interface SankeyNodeDragSibling {
  nodeId: string;
  element: SVGGraphicsElement;
  centerY: number;
}

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
  startCenterY: number;
  // Siblings sharing the dragged node's column, in their current `zones`
  // order, captured once at drag start - reorder decisions during the drag
  // compare the pointer against these fixed centers rather than re-querying
  // the DOM every move.
  siblings: SankeyNodeDragSibling[];
  links: SankeyNodeDragLink[];
  moved: boolean;
  lastDx: number;
  lastDy: number;
  highlighted: SVGGraphicsElement | null;
}
