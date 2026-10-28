import type { ShadowStyle } from '../shadow';

export type IsometricFace = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

export interface IsometricObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  footprint?: Array<[number, number]>;
  form?: 'box' | 'sphere';
  rotation?: number;
  order?: number;
  sourceIndex?: number;

  text?: string;
  icon?: string;

  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  // The light lines along the edges of a box. They are drawn unless this is false.
  seams?: boolean;
  hasShadow?: boolean;
  shadowStyle?: ShadowStyle;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelBackground?: string;

  parentFrameId?: string;
}
