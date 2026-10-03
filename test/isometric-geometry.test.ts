import { describe, expect, it } from 'vitest';
import { AXIS_COS, AXIS_SIN, isometricBounds, isometricFaces } from '../src/model/isometricObject';

describe('isometricFaces', () => {
  it('anchors the apex depth-in from x, with width/depth as independent true edge lengths at the fixed axis angle', () => {
    const object = { x: 10, y: 20, width: 120, height: 130, depth: 28 };
    const faces = isometricFaces(object);

    const apex = { x: object.x + object.depth * AXIS_COS, y: object.y };
    const right = { x: apex.x + object.width * AXIS_COS, y: apex.y + object.width * AXIS_SIN };
    const left = { x: apex.x - object.depth * AXIS_COS, y: apex.y + object.depth * AXIS_SIN };
    const center = { x: right.x - object.depth * AXIS_COS, y: right.y + object.depth * AXIS_SIN };
    const bottom = { x: center.x, y: center.y + object.height };
    const bottomLeft = { x: left.x, y: left.y + object.height };
    const bottomRight = { x: right.x, y: right.y + object.height };

    expect(faces).toEqual({
      top: [apex, right, center, left],
      front: [left, center, bottom, bottomLeft],
      side: [center, right, bottomRight, bottom],
    });
  });

  it('leaves the left vertex (and bottomLeft) untouched when only width changes - they carry no width term', () => {
    const base = { x: 10, y: 20, width: 100, height: 130, depth: 28 };
    const wider = { ...base, width: 160 };

    expect(isometricFaces(wider).top[3]).toEqual(isometricFaces(base).top[3]); // left
    expect(isometricFaces(wider).front[3]).toEqual(isometricFaces(base).front[3]); // bottomLeft
    // right moves by exactly the width delta, along the fixed axis direction
    const dRight = {
      x: isometricFaces(wider).top[1].x - isometricFaces(base).top[1].x,
      y: isometricFaces(wider).top[1].y - isometricFaces(base).top[1].y,
    };
    expect(dRight.x).toBeCloseTo(60 * AXIS_COS, 5);
    expect(dRight.y).toBeCloseTo(60 * AXIS_SIN, 5);
  });

  it('leaves the whole top rhombus fixed when only height changes', () => {
    const base = { x: 10, y: 20, width: 100, height: 130, depth: 28 };
    const taller = { ...base, height: 200 };

    expect(isometricFaces(taller).top).toEqual(isometricFaces(base).top);
  });

  it('clamps negative depth to zero rather than mirroring the box', () => {
    const faces = isometricFaces({ x: 0, y: 0, width: 40, height: 30, depth: -10 });
    expect(faces.top[0]).toEqual(faces.top[3]); // apex and left coincide when depth is 0
  });
});

describe('isometricBounds', () => {
  it('derives the on-screen box from width/depth at the fixed axis angle, plus the vertical wall height', () => {
    const object = { x: 10, y: 20, width: 120, height: 130, depth: 28 };
    expect(isometricBounds(object)).toEqual({
      x: 10,
      y: 20,
      width: (120 + 28) * AXIS_COS,
      height: 130 + (120 + 28) * AXIS_SIN,
    });
  });

  it('gives a true cube (equal width/height/depth) a 2:√3 aspect ratio', () => {
    const bounds = isometricBounds({ x: 0, y: 0, width: 100, height: 100, depth: 100 });
    expect(bounds.width).toBeCloseTo(200 * AXIS_COS, 5);
    expect(bounds.height).toBeCloseTo(300 * AXIS_SIN, 5);
  });
});
