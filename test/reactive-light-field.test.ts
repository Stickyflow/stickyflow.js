import { describe, expect, it } from 'vitest';
import { normalizedLightPosition } from '../src/runtime/viewer/shaders/reactiveLightField';

describe('reactive light field geometry', () => {
  it('keeps an emitter below a receiver below in top-origin coordinates', () => {
    expect(normalizedLightPosition(50, 150, 0, 0, 100, 100)).toEqual([0.5, 1.5]);
  });

  it('keeps an emitter above a receiver above in top-origin coordinates', () => {
    expect(normalizedLightPosition(50, -50, 0, 0, 100, 100)).toEqual([0.5, -0.5]);
  });
});
