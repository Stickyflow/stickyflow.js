import { describe, expect, it } from 'vitest';
import { isometricFaces } from '../src/model/isometricObject';

describe('isometricFaces', () => {
  it('projects three connected faces inside the declared bounds', () => {
    expect(
      isometricFaces({
        x: 10,
        y: 20,
        width: 120,
        height: 130,
        depth: 28,
      }),
    ).toEqual({
      top: [
        { x: 70, y: 20 },
        { x: 130, y: 48 },
        { x: 70, y: 76 },
        { x: 10, y: 48 },
      ],
      front: [
        { x: 10, y: 48 },
        { x: 70, y: 76 },
        { x: 70, y: 150 },
        { x: 10, y: 122 },
      ],
      side: [
        { x: 70, y: 76 },
        { x: 130, y: 48 },
        { x: 130, y: 122 },
        { x: 70, y: 150 },
      ],
    });
  });

  it('clamps depth to half the available size', () => {
    const faces = isometricFaces({
      x: 0,
      y: 0,
      width: 40,
      height: 30,
      depth: 100,
    });

    expect(faces.top[1]).toEqual({ x: 40, y: 15 });
    expect(faces.top[2]).toEqual({ x: 20, y: 30 });
  });
});