import type { Bounds } from './scene';

export const EMPTY_BOUNDS: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

export function boxBounds(x: number, y: number, width: number, height: number, extra = 0): Bounds {
  return {
    minX: x - extra,
    minY: y - extra,
    maxX: x + width + extra,
    maxY: y + height + extra,
  };
}

export function rotatedBounds(x: number, y: number, width: number, height: number, degrees: number, extra = 0): Bounds {
  if (!degrees) {
    return boxBounds(x, y, width, height, extra);
  }

  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corners = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  const rotated = corners.map(([pointX, pointY]) => ({
    x: centerX + (pointX - centerX) * cos - (pointY - centerY) * sin,
    y: centerY + (pointX - centerX) * sin + (pointY - centerY) * cos,
  }));
  return {
    minX: Math.min(...rotated.map(point => point.x)) - extra,
    minY: Math.min(...rotated.map(point => point.y)) - extra,
    maxX: Math.max(...rotated.map(point => point.x)) + extra,
    maxY: Math.max(...rotated.map(point => point.y)) + extra,
  };
}
