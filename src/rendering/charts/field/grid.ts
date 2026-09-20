import { idwInterpolate } from './idw';
import type { FieldGrid, FieldSample } from './types';

export const FIELD_GRID_MAX_CELLS = 32;

export function computeFieldGrid(samples: FieldSample[], width: number, height: number, power: number): FieldGrid {
  const aspect = width > 0 && height > 0 ? width / height : 1;
  const cols = Math.max(
    2,
    Math.min(FIELD_GRID_MAX_CELLS, Math.round(Math.sqrt(FIELD_GRID_MAX_CELLS * FIELD_GRID_MAX_CELLS * aspect))),
  );
  const rows = Math.max(2, Math.round(cols / aspect));
  const grid = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    const pointY = height * (row / (rows - 1));
    for (let column = 0; column < cols; column++) {
      const pointX = width * (column / (cols - 1));
      grid[row * cols + column] = samples.length ? idwInterpolate(samples, pointX, pointY, power) : 0;
    }
  }
  return { grid, cols, rows };
}
