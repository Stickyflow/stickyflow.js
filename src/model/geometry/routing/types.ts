export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Port {
  side: Side;
  offset: number;
}

export interface CubicPoints {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
  p3: [number, number];
}
export interface PathSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  midpoint: { x: number; y: number };
  originalMidpoint: { x: number; y: number };
  isHorizontal: boolean;
  canMove: boolean;
}

export interface OrthoPath {
  points: number[];
  segments: PathSegment[];
}
