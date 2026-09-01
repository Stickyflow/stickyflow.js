import type { PathSegment } from '../../router';

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface PathPointsResult {
  points: number[];
  segments: PathSegment[];
}
