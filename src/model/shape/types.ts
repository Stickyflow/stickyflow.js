import type { ShadowStyle } from '../shadows';
import type { GradientColorObject, MeshGradientObject, ShapeStrokeStyle, ShapeStyle } from './paint';

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
  boardId?: string;
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

  strokeColor?: string | GradientColorObject | null;
  strokeWidth?: number;
  fillColor?: string | GradientColorObject | MeshGradientObject | null;
  cornerRadius?: number | null;
  dash?: number[];
  strokeStyle?: ShapeStrokeStyle;

  hasShadow?: boolean;
  shadowStyle?: ShadowStyle;

  shapeStyle?: ShapeStyle;

  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;

  parent_frame_id?: string | null;

  parent_swimlane_id?: string | null;
  lane_id?: string | null;

  subShapes?: SubShape[] | null;

  symbol?: SymbolDef | null;

  createdAt?: string;
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
