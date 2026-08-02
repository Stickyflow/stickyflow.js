import type { MarkerType } from './links';

export interface PathPoint { x: number; y: number }

export interface FreeformPath {
  id: string;
  x: number; y: number; width: number; height: number;
  points: PathPoint[];
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  opacity?: number;
  tension?: number;
  start_marker?: Extract<MarkerType, 'none' | 'arrow' | 'filled_arrow'>;
  end_marker?: Extract<MarkerType, 'none' | 'arrow' | 'filled_arrow'>;
  closed?: boolean;
  fill_color?: string;
  order?: number;
  is_visible?: boolean;
}
