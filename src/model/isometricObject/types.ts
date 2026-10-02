import type { ShadowStyle } from '../shadow';

export interface IsometricObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  rotation?: number;
  order?: number;

  text?: string;
  icon?: string;

  topFill?: string;
  frontFill?: string;
  sideFill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  shadow?: ShadowStyle;

  parentFrameId?: string;
}