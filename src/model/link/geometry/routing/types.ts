import type { PathSegment } from '../../../geometry/routing';

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface PathPointsResult {
  points: number[];
  segments: PathSegment[];
}
