import { describe, expect, it } from 'vitest';
import { render } from '../src';

const chart = (type: string, style: string) => `sfl 1.2

Model M {
  Chart c {
    type: ${type}
    style { ${style} }
    layout { position: 0, 0; size: 300, 200 }
    Axis x { min: 0; max: 10; step: 5 }
    Axis y { min: 0; max: 10; step: 5 }
    Series a { values: [[2, 3], [7, 8]] }
  }
}
`;

describe('gridLineStyle', () => {
  it('draws solid gridlines with no dasharray by default', () => {
    const { svg } = render(chart('bar', ''));
    expect(svg).not.toContain('stroke-dasharray');
  });

  it('draws dashed gridlines with a butt cap by default', () => {
    const { svg } = render(chart('bar', 'gridLineStyle: dashed'));
    const line = svg.match(/<path id="[^"]*chart-grid-x-[^"]*"[^>]*>/)?.[0];
    expect(line).toContain('stroke-dasharray');
    expect(line).not.toContain('stroke-linecap="round"');
  });

  it('rounds the dashed caps when gridRoundedCorners is set', () => {
    const dashed = render(chart('bar', 'gridLineStyle: dashed\n      gridRoundedCorners: true')).svg;
    const dashedLine = dashed.match(/<path id="[^"]*chart-grid-x-[^"]*"[^>]*>/)?.[0];
    expect(dashedLine).toContain('stroke-linecap="round"');
  });

  it('draws no lines at all for dotted — one dot per axis-tick intersection instead', () => {
    const { svg } = render(chart('bar', 'gridLineStyle: dotted'));
    expect(svg).not.toContain('chart-grid-x-');
    expect(svg).not.toContain('chart-grid-y-');
    expect(svg.match(/chart-grid-dot-c-/g)).toHaveLength(9);
  });

  it('renders each dot as a small square by default, or a circle with gridRoundedCorners', () => {
    const { scene } = render(chart('bar', 'gridLineStyle: dotted'));
    const dot = scene.nodes.find(node => node.id.includes('chart-grid-dot-'));
    expect(dot?.type).toBe('rect');

    const { scene: roundedScene } = render(chart('bar', 'gridLineStyle: dotted\n      gridRoundedCorners: true'));
    const roundedDot = roundedScene.nodes.find(node => node.id.includes('chart-grid-dot-'));
    expect(roundedDot?.type).toBe('ellipse');
  });

  it('draws the same gridlines pixel-for-pixel as a stroked line, not a filled rect, for the default solid style', () => {
    const { scene } = render(chart('bar', ''));
    const line = scene.nodes.find(node => node.id.includes('chart-grid-x-'));
    expect(line?.type).toBe('path');
  });
});

describe('gridShape: circle', () => {
  it.each(['scatter', 'custom', 'hexbin'])(
    'draws concentric rings and spokes instead of a rectangular grid on %s, with no diagnostic',
    type => {
      const { diagnostics, svg } = render(chart(type, 'gridShape: circle'));
      expect(diagnostics.filter(d => d.code === 'unsupported-grid-shape')).toEqual([]);
      expect(svg).toContain('chart-grid-ring-');
      expect(svg).toContain('chart-grid-spoke-');
      expect(svg).not.toContain('chart-grid-x-');
      expect(svg).not.toContain('chart-grid-y-');
    },
  );

  it.each(['bar', 'line', 'heatmap', 'pie', 'treemap'])(
    'reports unsupported-grid-shape on %s and falls back to the rectangular grid',
    type => {
      const { diagnostics, svg } = render(chart(type, 'gridShape: circle'));
      const warnings = diagnostics.filter(d => d.code === 'unsupported-grid-shape');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].ownerId).toBe('c');
      expect(warnings[0].message).toContain(type);
      expect(svg).not.toContain('chart-grid-ring-');
    },
  );

  it.each(['radar', 'radial'])('reports no diagnostic on %s, which is already circular by nature', type => {
    const { diagnostics } = render(chart(type, 'gridShape: circle'));
    expect(diagnostics.filter(d => d.code === 'unsupported-grid-shape')).toEqual([]);
  });

  it('combines with gridLineStyle: dotted — dots at each ring/spoke intersection, no rings or spokes drawn', () => {
    const { svg } = render(chart('scatter', 'gridShape: circle\n      gridLineStyle: dotted'));
    expect(svg).not.toContain('chart-grid-ring-');
    expect(svg).not.toContain('chart-grid-spoke-');
    expect(svg.match(/chart-grid-dot-c-/g)).toHaveLength(6);
  });
});
