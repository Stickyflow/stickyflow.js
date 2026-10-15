import type { GuideLine } from '../../dom';

export type EdgePoint = 'min' | 'center' | 'max';

export type RectGuideLine = Extract<GuideLine, { orientation: 'vertical' | 'horizontal' }>;

export interface AxisSnap {
  delta: number;
  guide: RectGuideLine | null;
}

export interface SnapResult {
  x: AxisSnap;
  y: AxisSnap;
}

export interface SnapConfig {
  threshold: number;
  activeX: EdgePoint[];
  activeY: EdgePoint[];
  guideOverhang: number;
}

export const MOVE_ACTIVE_POINTS: EdgePoint[] = ['min', 'center', 'max'];
