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
