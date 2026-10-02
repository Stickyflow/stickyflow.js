import { describe, expect, it } from 'vitest';
import { sflToRenderInput } from '../src';

describe('Isometric RenderInput', () => {
  it('adapts an isometric semantic object to the renderer contract', () => {
    const input = sflToRenderInput(`sfl 1

Model example {
  Isometric relay {
    text: "Relay"
    depth: 28
    icon: "server"

    layout {
      position: 320, 180
      size: 120, 130
    }

    style {
      topFill: "#7c3aed"
      frontFill: "#5b21e8"
      sideFill: "#4c1dca"
      stroke: "#111827"
      strokeWidth: 2
      cornerRadius: 10
    }
  }
}
`);

    expect(input.isometricObjects).toEqual([
      expect.objectContaining({
        id: 'relay',
        x: 320,
        y: 180,
        width: 120,
        height: 130,
        depth: 28,
        text: 'Relay',
        icon: 'server',
        topFill: '#7c3aed',
        frontFill: '#5b21e8',
        sideFill: '#4c1dca',
        strokeColor: '#111827',
        strokeWidth: 2,
        cornerRadius: 10,
      }),
    ]);
  });
});
