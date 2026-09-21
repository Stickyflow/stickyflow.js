import { describe, expect, it } from 'vitest';
import { render, SHAPE_TYPES } from '../src/index';

const entity = (style: string) => `sfl 1.4

Model M {
  Entity e {
    style { ${style} }
    layout { position: 0, 0; size: 120, 80 }
  }
}
`;

describe('the built-in shape set', () => {
  it('ships exactly the meaningful shapes, with no duplicates or look-alikes', () => {
    expect([...SHAPE_TYPES].sort()).toEqual(
      [
        'cloud',
        'cylinder',
        'diamond',
        'document',
        'hexagon',
        'note',
        'oval',
        'parallelogram',
        'person',
        'pill',
        'predefined_process',
        'rectangle',
        'rounded_rectangle',
        'symbol',
        'trapezoid',
        'triangle',
      ].sort(),
    );
  });

  it.each(['note', 'cloud', 'predefined_process'])('renders %s as a path from SFL without diagnostics', shape => {
    const { svg, diagnostics } = render(entity(`shape: ${shape}`));
    expect(diagnostics).toEqual([]);
    expect(svg).toMatch(new RegExp(`<path id="sf-shape-e"[^>]*data-sf-kind="${shape}"`));
  });

  it('draws a dashed outline on any shape through strokeStyle, so no dashed-rectangle type is needed', () => {
    const { svg } = render(entity('shape: rectangle; strokeStyle: dashed; stroke: "#000000"'));
    expect(svg).toMatch(/<rect id="sf-shape-e"[^>]*stroke-dasharray=/);
  });
});

describe('an unknown or removed shape name is reported, not silently swapped', () => {
  it('points circle at oval', () => {
    const { svg, diagnostics } = render(entity('shape: circle'));
    expect(svg).toMatch(/<rect id="sf-shape-e"/);
    expect(diagnostics?.map(d => d.message).join('\n')).toContain("use 'oval'");
  });

  it('points container_rectangle at rectangle with strokeStyle', () => {
    const { diagnostics } = render(entity('shape: container_rectangle'));
    expect(diagnostics?.map(d => d.message).join('\n')).toContain('strokeStyle: dashed');
  });

  it('reports a plain typo through the same warning, including a shape inherited from a Style', () => {
    const sfl = `sfl 1.4

Style Base { shape: hexagonn }

Model M {
  Entity e : Base { layout { position: 0, 0; size: 120, 80 } }
}
`;
    const { diagnostics } = render(sfl);
    expect(diagnostics?.some(d => d.code === 'unknown-shape-type' && d.entityId === 'e')).toBe(true);
  });
});
