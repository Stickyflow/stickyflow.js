import type { GradientColor, MeshGradientColor } from '../color/types';
import type { ShadowStyle } from '../shadow';
import type { ShapeStrokeStyle } from './appearance';

export type ShapeType =
  | 'rounded_rectangle'
  | 'rectangle'
  | 'diamond'
  | 'oval'
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
  fontWeight?: 'normal' | 'bold';
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

  hasShadow?: boolean;
  shadowStyle?: ShadowStyle;

  layerGroup?: string;
  orderKey?: string;
  isVisible?: boolean;
  isLocked?: boolean;

  parentFrameId?: string | null;

  parentSwimlaneId?: string | null;
  laneId?: string | null;

  subShapes?: SubShape[] | null;

  symbol?: SymbolDef | null;
}

export interface SubShape {
  id: string;
  text: string;
}

export interface SymbolDef {
  name: string;
  points: Array<[number, number]>;
  tension?: number;
  ports?: Array<{ name: string; at: [number, number] }>;
}
