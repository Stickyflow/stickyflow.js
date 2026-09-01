import type { Bounds, Side } from '../../model/geometry/router';
import type { PathType } from '../../model/links';

export interface LiveLink {
  path: SVGPathElement;
  pathType: PathType;
  fromSide: Side | null;
  toSide: Side | null;
  otherBounds: Bounds;
  draggedIsFrom: boolean;
  strokeWidth: number;
  labelText: SVGTextElement | null;
  initialMidpoint: { x: number; y: number } | null;
  labelGapSize: { width: number; height: number } | null;
}
