import type { PathSegment } from '../../../geometry/routing';

export interface LinkRoutePoint {
  x: number;
  y: number;
}

export interface LinkRoute {
  points: number[];
  segments: PathSegment[];
}
