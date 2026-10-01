import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const barOf = (config = '') => `sfl 1.4

Model M {
  Chart c {
    type: bar
    ${config}
    Series a { color: "#6d5ef0"; values: [40] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`;

const stackedOf = (config = '', mode = 'true') => `sfl 1.4

Model M {
  Chart c {
    type: bar
    stacked: ${mode}
    ${config}
    Series a { color: "#6d5ef0"; values: [40] }
    Series b { color: "#db2777"; values: [30] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`;

function barPath(svg: string, id = 'sf-chart-bar-c-a-0'): string {
  const match = svg.match(new RegExp(`<path id="${id}"[^>]*\\/?>`));
  if (!match) {
    throw new Error(`no bar path "${id}" in output`);
  }
  return match[0];
}

// barShapePath only emits a Q (quadratic) command when it's actually
// rounding a corner - a plain M/H/V/H/Z square has none.
const isRounded = (path: string) => path.includes(' Q ');

describe('bar border and corner radius', () => {
  it('an unconfigured bar keeps its previous look : radius 2, rounded, no visible border', () => {
    const path = barPath(render(barOf()).svg);
    expect(path).toContain('data-sf-bar-radius="2"');
    expect(isRounded(path)).toBe(true);
    expect(path).toMatch(/stroke-width="0"/);
  });

  it('barCornerRadius overrides the default radius', () => {
    const path = barPath(render(barOf('barCornerRadius: 8')).svg);
    expect(path).toContain('data-sf-bar-radius="8"');
  });

  it('barCornerRadius: 0 renders square corners, not a stray radius', () => {
    const path = barPath(render(barOf('barCornerRadius: 0')).svg);
    expect(path).toContain('data-sf-bar-radius="0"');
    expect(isRounded(path)).toBe(false);
  });

  it('barBorderWidth draws a visible border in the given color', () => {
    const path = barPath(render(barOf('barBorderWidth: 2; barBorderColor: "#0f172a"')).svg);
    expect(path).toContain('stroke-width="2"');
    expect(path).toContain('stroke="#0f172a"');
  });

  it('barBorderColor without a width still has no visible border (width still 0)', () => {
    const path = barPath(render(barOf('barBorderColor: "#0f172a"')).svg);
    expect(path).toMatch(/stroke-width="0"/);
  });

  it('stacked : only the outermost (last) series rounds, so segments never round at a seam', () => {
    const svg = render(stackedOf()).svg;
    const inner = barPath(svg, 'sf-chart-bar-c-a-0'); // series a : bottom of the stack
    const outer = barPath(svg, 'sf-chart-bar-c-b-0'); // series b : top of the stack

    expect(inner).toContain('data-sf-bar-radius="0"');
    expect(isRounded(inner)).toBe(false);
    expect(outer).toContain('data-sf-bar-radius="2"');
    expect(isRounded(outer)).toBe(true);
  });

  it('barCornerRadius on a stacked chart still only reaches the outer segment', () => {
    const svg = render(stackedOf('barCornerRadius: 6')).svg;
    const inner = barPath(svg, 'sf-chart-bar-c-a-0');
    const outer = barPath(svg, 'sf-chart-bar-c-b-0');

    expect(inner).toContain('data-sf-bar-radius="0"');
    expect(outer).toContain('data-sf-bar-radius="6"');
  });

  it('barBorderWidth still reaches every segment of a stack, inner and outer alike', () => {
    const svg = render(stackedOf('barBorderWidth: 1; barBorderColor: "#111827"')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).toContain('stroke-width="1"');
    expect(barPath(svg, 'sf-chart-bar-c-b-0')).toContain('stroke-width="1"');
  });

  it('waterfall bars round individually : they never share a seam the way true/percent do', () => {
    const svg = render(stackedOf('barCornerRadius: 6', 'waterfall')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).toContain('data-sf-bar-radius="6"');
    expect(barPath(svg, 'sf-chart-bar-c-b-0')).toContain('data-sf-bar-radius="6"');
  });

  it('leaves boxplot unaffected — it already read these properties before this change', () => {
    const boxplot = `sfl 1.4

Model M {
  Chart c {
    type: boxplot
    barCornerRadius: 5
    barBorderWidth: 3
    barBorderColor: "#111827"
    Series a { values: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`;
    const { diagnostics } = render(boxplot);
    expect(diagnostics).toEqual([]);
  });
});
