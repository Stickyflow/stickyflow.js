import { describe, expect, it } from 'vitest';
import { render } from '../src';

describe('Isometric rendering pipeline', () => {
  it('renders an SFL object through semantic resolution, scene building and SVG serialization', () => {
    const result = render(`sfl 1

Model infrastructure {
  Isometric relay {
    text: "Relay"

    layout {
      position: 40, 50
      size: 100, 120, 20
    }

    style {
      topFill: "#7c3aed"
      frontFill: "#5b21e8"
      sideFill: "#4c1dca"
      stroke: "#111827"
      strokeWidth: 2
      cornerRadius: 8
      shadow: "on"
    }
  }
}
`);

    expect(result.diagnostics).toEqual([]);
    expect(result.scene.nodes.map(node => node.id)).toEqual([
      'isometric-relay-ground-shadow',
      'isometric-relay-top',
      'isometric-relay-front',
      'isometric-relay-side',
      'isometric-relay-label-guide',
      'isometric-relay-label',
    ]);
    expect(result.svg).toContain('id="sf-isometric-relay-ground-shadow"');
    expect(result.svg).toContain('id="sf-isometric-relay-top"');
    expect(result.svg).toContain('id="sf-isometric-relay-front"');
    expect(result.svg).toContain('id="sf-isometric-relay-side"');
    expect(result.svg).toContain('id="sf-isometric-relay-label-guide"');
    expect(result.svg).toContain('>Relay</tspan>');
  });
});
