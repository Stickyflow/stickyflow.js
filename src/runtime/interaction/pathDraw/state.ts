import type { OwnerRef } from '../../viewer';
import type { DrawPoint } from './geometry';

export interface PathContinuation {
  owner: OwnerRef;
  atStart: boolean;
  points: DrawPoint[];
  cornerRadii: number[];
}

export interface PathDrawState {
  active: boolean;
  points: DrawPoint[];
  cursor: DrawPoint | null;
  willClose: boolean;
  tension: number;
  onExit: (() => void) | null;
  previewGroup: SVGGElement | null;
  previewLine: SVGPathElement | null;
  lastDown: { time: number; x: number; y: number } | null;
  // The cursor lies on a point of a path.
  onPoint: boolean;
  continues: PathContinuation | null;
}

export function createIdlePathDrawState(): PathDrawState {
  return {
    active: false,
    points: [],
    cursor: null,
    willClose: false,
    tension: 0,
    onExit: null,
    previewGroup: null,
    previewLine: null,
    lastDown: null,
    onPoint: false,
    continues: null,
  };
}
