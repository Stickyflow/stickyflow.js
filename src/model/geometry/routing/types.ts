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
  start: Point;
  end: Point;
  midpoint: Point;
  originalMidpoint: Point;
  isHorizontal: boolean;
  canMove: boolean;
}

export interface OrthoPath {
  points: number[];
  segments: PathSegment[];
}

import type { Point } from '../types';
