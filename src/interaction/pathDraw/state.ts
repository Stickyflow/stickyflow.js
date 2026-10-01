import type { DrawPoint } from './geometry';

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
  };
}
