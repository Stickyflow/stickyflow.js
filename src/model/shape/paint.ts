import type { ColorStop } from '../color/types';
import type { ShadowStyle } from '../shadows';

export type {
  ColorStop,
  GradientColor,
  GradientColorObject,
  MeshGradientColor,
  MeshGradientObject,
} from '../color/types';
export type { ShadowStyle };

export type ShapeStrokeStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export interface FillStyle {
  type: 'none' | 'solid' | 'linear' | 'radial';
  color?: string;
  colors?: ColorStop[];
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  startRadius?: number;
  endRadius?: number;
  opacity?: number;
}

export interface StrokeStyle {
  type: 'none' | 'solid' | 'linear' | 'radial';
  color?: string;
  colors?: ColorStop[];
  width?: number;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  startRadius?: number;
  endRadius?: number;
  opacity?: number;
  dash?: number[];
}

export interface ShapeStyle {
  fill?: FillStyle;
  stroke?: StrokeStyle;
  opacity?: number;
}
