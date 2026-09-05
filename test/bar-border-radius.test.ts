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

const stackedOf = (config = '') => `sfl 1.4

Model M {
  Chart c {
    type: bar
    stacked: true
    ${config}
    Series a { color: "#6d5ef0"; values: [40] }
    Series b { color: "#db2777"; values: [30] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`;

function barRect(svg: string): string {
  const match = svg.match(/<rect id="sf-chart-bar-[^"]*"[^>]*\/?>/);
  if (!match) {
    throw new Error('no bar rect in output');
  }
  return match[0];
}

describe('bar border and corner radius', () => {
  it('an unconfigured bar renders exactly as before : rx=2, no visible border', () => {
    const rect = barRect(render(barOf()).svg);
    expect(rect).toContain('rx="2"');
    expect(rect).toMatch(/stroke-width="0"/);
  });

  it('barCornerRadius overrides the default radius', () => {
    const rect = barRect(render(barOf('barCornerRadius: 8')).svg);
    expect(rect).toContain('rx="8"');
  });

  it('barBorderWidth draws a visible border in the given color', () => {
    const rect = barRect(render(barOf('barBorderWidth: 2; barBorderColor: "#0f172a"')).svg);
    expect(rect).toContain('stroke-width="2"');
    expect(rect).toContain('stroke="#0f172a"');
  });

  it('barBorderColor without a width still has no visible border (width still 0)', () => {
    const rect = barRect(render(barOf('barBorderColor: "#0f172a"')).svg);
    expect(rect).toMatch(/stroke-width="0"/);
  });

  it('applies the same defaults and overrides to stacked bars', () => {
    const plain = barRect(render(stackedOf()).svg);
    expect(plain).toContain('rx="2"');
    expect(plain).toMatch(/stroke-width="0"/);

    const styled = barRect(render(stackedOf('barCornerRadius: 6; barBorderWidth: 1')).svg);
    expect(styled).toContain('rx="6"');
    expect(styled).toContain('stroke-width="1"');
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
