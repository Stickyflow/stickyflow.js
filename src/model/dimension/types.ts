import type { Point } from '../geometry/types';

export interface Dimension {
  id: string;
  start: Point;
  end: Point;
  offset: number;
  text?: string;
  unit?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textColor?: string;
  fontSize?: number;
  order?: number;
  sourceIndex?: number;
  parentFrameId?: string;
}
