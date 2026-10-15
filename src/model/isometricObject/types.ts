import type { ShadowStyle } from '../shadow';

export type IsometricFace = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

export interface IsometricObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  rotation?: number;
  order?: number;
  sourceIndex?: number;

  text?: string;
  icon?: string;

  fill?: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  hasShadow?: boolean;
  shadowStyle?: ShadowStyle;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelBackground?: string;

  parentFrameId?: string;
}
