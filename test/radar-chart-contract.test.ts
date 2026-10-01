import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const radarOf = (type: 'radar' | 'radial') => `sfl 1.4

Model M {
  Chart c {
    type: ${type}
    categories: ["Speed", "Quality", "Cost", "Reliability"]
    Axis value { min: 0; max: 5; step: 1 }
    Series a { color: "#6d5ef0"; values: [3, 4, 2, 5] }
    Series b { color: "#0ea5e9"; values: [2, 3, 4, 1] }
    layout { position: 0, 0; size: 340, 260 }
  }
}
`;

function vertexNode(svg: string, series: string, index: number): string {
  const match = svg.match(
    new RegExp(`<ellipse[^>]*data-sf-series="${series}"[^>]*data-sf-value-index="${index}"[^>]*>`),
  );
  if (!match) {
    throw new Error(`no radar vertex ${series}[${index}] in output`);
  }
  return match[0];
}

describe('radar chart — interaction contract', () => {
  it('carries the polar geometry on the chart frame', () => {
    const svg = render(radarOf('radar')).svg;
    const geometry = svg.match(/data-sf-radar-geometry="([^"]*)"/)?.[1];
    expect(geometry).toBeDefined();
    const [cx, cy, radius, min, max, count, curved] = (geometry ?? '').split(',').map(Number);
    expect([cx, cy, radius].every(Number.isFinite)).toBe(true);
    expect(min).toBe(0);
    expect(max).toBe(5);
    expect(count).toBe(4);
    expect(curved).toBe(0);
  });

  it('flags radial as curved', () => {
    const svg = render(radarOf('radial')).svg;
    expect(svg.match(/data-sf-radar-geometry="[^"]*,(\d)"/)?.[1]).toBe('1');
  });

  it('grows the plotted radius when the category labels are switched off', () => {
    const radiusOf = (svg: string) => Number(svg.match(/data-sf-radar-geometry="[^,]*,[^,]*,([^,]*)/)?.[1]);
    const labelled = radiusOf(render(radarOf('radar')).svg);
    const bare = radiusOf(
      render(radarOf('radar').replace('step: 1 }', 'step: 1 }\n    style { showAxisLabels: false }')).svg,
    );
    expect(bare).toBeGreaterThan(labelled);
  });

  it('tags every vertex with its series, index, mark and value prop', () => {
    const svg = render(radarOf('radar')).svg;
    const node = vertexNode(svg, 'a', 2);
    expect(node).toContain('data-sf-mark="radar-vertex"');
    expect(node).toContain('data-sf-prop="Series[a].values[2]"');
  });

  it('gives the fill and stroke polygons a series tag so a drag can find them', () => {
    const svg = render(radarOf('radar')).svg;
    expect(svg).toMatch(/<path[^>]*chart-radar-fill-c-a"[^>]*data-sf-series="a"/);
    expect(svg).toMatch(/<path[^>]*chart-radar-series-c-a"[^>]*data-sf-series="a"/);
  });
});
