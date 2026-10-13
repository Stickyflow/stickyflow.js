import type { Point } from '../geometry/types';
import type { MarkerType } from '../link';

export type PathPoint = Point;

export interface FreeformPath {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points: PathPoint[];
  value?: number;
  strokeColor?: string;
  strokeWidth?: number;
  dash?: number[];
  opacity?: number;
  tension?: number;
  startMarker?: Extract<MarkerType, 'none' | 'arrow' | 'filled_arrow'>;
  endMarker?: Extract<MarkerType, 'none' | 'arrow' | 'filled_arrow'>;
  closed?: boolean;
  fillColor?: string;
  order?: number;
  sourceIndex?: number;
  isVisible?: boolean;
}
