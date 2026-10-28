import type { GradientColor, MeshGradientColor } from '../color/types';
import type { Shader } from '../shader';
import type { ShadowStyle } from '../shadow';

export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export type ShapeStrokeStyle = 'solid' | 'dashed' | 'dotted' | 'double';

export type ShapeType =
  | 'rounded_rectangle'
  | 'rectangle'
  | 'diamond'
  | 'oval'
  | 'circle'
  | 'cylinder'
  | 'document'
  | 'pill'
  | 'person'
  | 'triangle'
  | 'hexagon'
  | 'parallelogram'
  | 'trapezoid'
  | 'note'
  | 'cloud'
  | 'predefined_process'
  | 'symbol';

export interface Shape {
  id: string;
  name?: string;
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  text?: string | null;
  textColor?: string | null;

  fontSize?: number;
  fontWeight?: FontWeight;
  letterSpacing?: number;
  isText?: boolean;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  textVerticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;

  strokeColor?: string | GradientColor | null;
  strokeWidth?: number;
  fillColor?: string | GradientColor | MeshGradientColor | null;
  cornerRadius?: number | null;
  dash?: number[];
  strokeStyle?: ShapeStrokeStyle;
  opacity?: number;
  // Softens the whole shape, in pixels of spread; 0 or left out keeps its edge sharp.
  blur?: number;

  hasShadow?: boolean;
  shadowStyle?: ShadowStyle;

  layerGroup?: string;
  orderKey?: string;
  sourceIndex?: number;
  isVisible?: boolean;
  isLocked?: boolean;

  parentFrameId?: string | null;

  parentSwimlaneId?: string | null;
  laneId?: string | null;

  symbol?: SymbolDef | null;
  shader?: Shader;
}

export interface SymbolDef {
  name: string;
  points: Array<[number, number]>;
  tension?: number;
  ports?: Array<{ name: string; at: [number, number] }>;
}
