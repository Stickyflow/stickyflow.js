import type { ShadowStyle } from '../shadow';

export type IsometricFace = 'top' | 'front' | 'side';

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

  /** The top face's own color - front/side are derived shades of it (see
   *  deriveFaceFills), not independently settable. */
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
