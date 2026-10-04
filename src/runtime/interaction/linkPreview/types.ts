import type { Point, Rect, Side } from '../../../model/geometry/types';
import type { IsometricFace } from '../../../model/isometricObject';
import type { PathType } from '../../../model/link';

export interface LiveLink {
  path: SVGPathElement;
  pathType: PathType;
  fromSide: Side | null;
  toSide: Side | null;
  otherBounds: Rect;
  draggedIsFrom: boolean;
  strokeWidth: number;
  labelText: SVGTextElement | null;
  initialMidpoint: { x: number; y: number } | null;
  labelGapSize: { width: number; height: number } | null;
}

export interface LiveFaceLink {
  path: SVGPathElement;
  face: IsometricFace;
  otherPoint: Point;
  draggedIsFrom: boolean;
}
