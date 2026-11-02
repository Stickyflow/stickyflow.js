import type { Point } from '../geometry/types';
import type { MarkerType } from '../link';

export interface PathPoint extends Point {
  tension?: number;
}

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
  transition?: number;
  // How far the path shines around itself, and in which color. Without a color it shines in that of its stroke.
  glow?: number;
  glowColor?: string;
  tension?: number;
  // Rounds the corners of a straight path, each as far as its two sides allow.
  cornerRadius?: number;
  // The radius of each corner by the index of its point. Where it has no number, cornerRadius counts.
  cornerRadii?: number[];
  startMarker?: Extract<MarkerType, 'none' | 'arrow' | 'filled_arrow'>;
  endMarker?: Extract<MarkerType, 'none' | 'arrow' | 'filled_arrow'>;
  closed?: boolean;
  fillColor?: string;
  order?: number;
  sourceIndex?: number;
  isVisible?: boolean;
}
