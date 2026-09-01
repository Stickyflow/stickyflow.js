import type { GuideLine } from '../../viewer/alignmentGuideOverlay';

export type EdgePoint = 'min' | 'center' | 'max';

export interface AxisSnap {
  delta: number;
  guide: GuideLine | null;
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
