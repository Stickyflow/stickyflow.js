import { describe, expect, it } from 'vitest';
import { sflToCanvasState } from '../src/index';

describe('Path.value (choropleth region)', () => {
  const SFL = `sfl 1.2

Model board {
  Path region_a {
    points: [[0, 0], [100, 0], [100, 100], [0, 100]]
    closed: true
    value: 42.5
    style { fill: "#fee2e2" }
  }
}`;

  it('parses value off a closed Path', () => {
    const state = sflToCanvasState(SFL);
    expect(state.canvasObjects[0].path?.value).toBe(42.5);
  });

  it('leaves value undefined when never mentioned', () => {
    const withoutValue = SFL.replace('    value: 42.5\n', '');
    const state = sflToCanvasState(withoutValue);
    expect(state.canvasObjects[0].path?.value).toBeUndefined();
  });
});
