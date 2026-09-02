import type { Bounds, Point } from './scene';

export const EMPTY_BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

export interface BoundsFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function boxBounds(frame: BoundsFrame, extra = 0): Bounds {
  return {
    minX: frame.x - extra,
    minY: frame.y - extra,
    maxX: frame.x + frame.width + extra,
    maxY: frame.y + frame.height + extra,
  };
}

export function rotatedBounds(frame: BoundsFrame, degrees: number, extra = 0): Bounds {
  if (!degrees) {
    return boxBounds(frame, extra);
  }

  return boundsAroundPoints(rotateFrameCorners(frame, degrees), extra);
}

function rotateFrameCorners(frame: BoundsFrame, degrees: number): Point[] {
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return frameCorners(frame).map(point => ({
    x: centerX + (point.x - centerX) * cos - (point.y - centerY) * sin,
    y: centerY + (point.x - centerX) * sin + (point.y - centerY) * cos,
  }));
}

function frameCorners(frame: BoundsFrame): Point[] {
  return [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width, y: frame.y },
    { x: frame.x + frame.width, y: frame.y + frame.height },
    { x: frame.x, y: frame.y + frame.height },
  ];
}

function boundsAroundPoints(points: Point[], extra: number): Bounds {
  return {
    minX: Math.min(...points.map(point => point.x)) - extra,
    minY: Math.min(...points.map(point => point.y)) - extra,
    maxX: Math.max(...points.map(point => point.x)) + extra,
    maxY: Math.max(...points.map(point => point.y)) + extra,
  };
}
