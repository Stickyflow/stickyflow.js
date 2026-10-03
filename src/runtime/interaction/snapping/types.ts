import type { GuideLine } from '../../dom';

export type EdgePoint = 'min' | 'center' | 'max';

// computeSnap (alignment.ts) only ever produces straight horizontal/
// vertical guides - the full GuideLine union (which also covers the
// isometric diagonal snap's arbitrary-angle segments) would force every
// .guide?.position access at its call sites to first prove it isn't a
// 'segment', for a variant this function can't actually return.
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
