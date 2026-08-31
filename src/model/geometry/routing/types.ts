export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Bounds {
  x: number; y: number; width: number; height: number; rotation?: number;
}

export interface Port { side: Side; offset: number } // offset in [0..1]

export interface CubicPoints { p0:[number,number]; p1:[number,number]; p2:[number,number]; p3:[number,number] }
// 🎯 NEW: Segment-based representation for Miro-style multi-handle support
export interface PathSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  midpoint: { x: number; y: number }; // Current midpoint (WITH offset applied)
  originalMidpoint: { x: number; y: number }; // 🎯 NEW: Original midpoint WITHOUT offset
  isHorizontal: boolean; // true = horizontal line, false = vertical line
  canMove: boolean; // false for start/end segments (fixed to entity edges)
}

export interface OrthoPath { 
  points: number[]; // [x0,y0, x1,y1, ...] - the complete path
  segments: PathSegment[]; // 🎯 Individual segments with their midpoints and orientations
}

