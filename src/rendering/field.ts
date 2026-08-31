import type { ChartRamp } from '../model/charts';
import { hexToRgb, rgbToHex } from '../model/colorConversion';

const RAMP_FALLBACK_COLOR = '#94a3b8';

export function colorAtRamp(ramp: ChartRamp | undefined, value: number): string {
  if (!ramp?.stops.length) return RAMP_FALLBACK_COLOR;
  const stops = [...ramp.stops].sort((a, b) => a.position - b.position);
  if (stops.length === 1 || value <= stops[0].position) return stops[0].color;
  const last = stops[stops.length - 1];
  if (value >= last.position) return last.color;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i],
      b = stops[i + 1];
    if (value >= a.position && value <= b.position) {
      const span = b.position - a.position;
      const t = span === 0 ? 0 : (value - a.position) / span;
      const rgbA = hexToRgb(a.color),
        rgbB = hexToRgb(b.color);
      return rgbToHex(
        Math.round(rgbA.r + (rgbB.r - rgbA.r) * t),
        Math.round(rgbA.g + (rgbB.g - rgbA.g) * t),
        Math.round(rgbA.b + (rgbB.b - rgbA.b) * t),
      );
    }
  }
  return last.color;
}

export interface FieldSample {
  x: number;
  y: number;
  value: number;
}

export function idwInterpolate(samples: FieldSample[], px: number, py: number, power: number): number {
  let weightedSum = 0,
    weightSum = 0;
  for (const s of samples) {
    const dx = s.x - px,
      dy = s.y - py;
    const distSq = dx * dx + dy * dy;
    if (distSq === 0) return s.value;
    const w = 1 / distSq ** (power / 2);
    weightedSum += w * s.value;
    weightSum += w;
  }
  return weightSum === 0 ? 0 : weightedSum / weightSum;
}

export const FIELD_GRID_MAX_CELLS = 64;

export function computeFieldGrid(
  samples: FieldSample[],
  width: number,
  height: number,
  power: number,
): { grid: Float32Array; cols: number; rows: number } {
  const aspect = width > 0 && height > 0 ? width / height : 1;
  const cols = Math.max(
    2,
    Math.min(FIELD_GRID_MAX_CELLS, Math.round(Math.sqrt(FIELD_GRID_MAX_CELLS * FIELD_GRID_MAX_CELLS * aspect))),
  );
  const rows = Math.max(2, Math.round(cols / aspect));
  const grid = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    const py = height * (row / (rows - 1));
    for (let col = 0; col < cols; col++) {
      const px = width * (col / (cols - 1));
      grid[row * cols + col] = samples.length ? idwInterpolate(samples, px, py, power) : 0;
    }
  }
  return { grid, cols, rows };
}
