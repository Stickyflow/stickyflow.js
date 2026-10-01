import type { Point } from '../../../../../model/geometry/types';

export interface PathSegment {
  start: Point;
  end: Point;
  midpoint: Point;
  originalMidpoint: Point;
  isHorizontal: boolean;
  canMove: boolean;
}

export interface LinkRoutePoint {
  x: number;
  y: number;
}

export interface LinkRoute {
  points: number[];
  segments: PathSegment[];
}
