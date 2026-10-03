import { describe, expect, it } from 'vitest';
import { isIsometricObject, sflToCanvasState } from '../src';

describe('Isometric semantic resolution', () => {
  it('resolves an Isometric block as a typed canvas object', () => {
    const state = sflToCanvasState(`sfl 1

Model example {
  Isometric relay {
    text: "Relay"
    icon: "server"
    layout {
      position: 320, 180
      size: 120, 130, 28
    }
  }
}
`);

    const canvasObject = state.canvasObjects[0];

    expect(isIsometricObject(canvasObject)).toBe(true);

    if (!isIsometricObject(canvasObject)) {
      throw new Error('Expected an isometric canvas object');
    }

    expect(canvasObject).toMatchObject({
      id: 'relay',
      objectType: 'isometric',
      kind: 'isometric',
      text: 'Relay',
      x: 320,
      y: 180,
      width: 120,
      height: 130,
      isometric: {
        depth: 28,
        icon: 'server',
      },
    });
  });
});
