import { describe, expect, it } from 'vitest';
import { render, renderCanvas, sflToRenderInput } from '../src/index';
import { applyPropertyChange } from '../src/interaction/patchSfl';

const BAR = `sfl 1.4

Model board {
  Chart c {
    text: "Revenue"
    type: bar
    stacked: none
    categories: ["Q1", "Q2"]

    Axis x { min: 0; max: 2; step: 1; label: "Quarter" }
    Axis y { min: 0; max: 140; step: 20; label: "k€" }

    Series online { color: "#6d5ef0"; label: "Online"; values: [60, 62] }
    Series retail { color: "#db2777"; label: "Retail"; values: [40, 38] }

    Rule target { at: 90; text: "Target" }

    layout { position: 0, 0; size: 480, 300 }
  }
}
`;

const svgOf = (sfl: string) => render(sfl).svg;

const propsIn = (svg: string): string[] => [...svg.matchAll(/data-sf-prop="([^"]*)"/g)].map(match => match[1]);

const chartOf = (sfl: string) => {
  const first = sflToRenderInput(sfl).charts?.[0];
  if (!first) {
    throw new Error('no chart');
  }
  return first;
};

describe('data-sf-prop — what a rendered bar chart exposes', () => {
  const props = propsIn(svgOf(BAR));

  it('marks the title', () => {
    expect(props).toContain('text');
  });

  it('marks both axis labels', () => {
    expect(props).toContain('Axis[x].label');
    expect(props).toContain('Axis[y].label');
  });

  it('marks each legend label and swatch', () => {
    expect(props).toContain('Series[online].label');
    expect(props).toContain('Series[online].color');
    expect(props).toContain('Series[retail].label');
    expect(props).toContain('Series[retail].color');
  });

  it('marks every bar with its own value index', () => {
    expect(props).toContain('Series[online].values[0]');
    expect(props).toContain('Series[online].values[1]');
    expect(props).toContain('Series[retail].values[0]');
    expect(props).toContain('Series[retail].values[1]');
  });

  it('marks the rule line and its label', () => {
    expect(props).toContain('Rule[target].at');
    expect(props).toContain('Rule[target].text');
  });

  it('keeps the existing chart-value contract alongside it', () => {
    const svg = svgOf(BAR);
    expect(svg).toContain('data-sf-series="online"');
    expect(svg).toContain('data-sf-value-index="0"');
    expect(svg).toContain('data-sf-value-scale=');
  });

  it('emits no prop attribute on undecorated nodes', () => {
    expect(propsIn(svgOf(BAR)).every(prop => prop.length > 0)).toBe(true);
  });
});

describe('data-sf-prop — every emitted path resolves back into the source', () => {
  it('round-trips each one through applyPropertyChange', () => {
    const seen = new Set(propsIn(svgOf(BAR)));
    expect(seen.size).toBeGreaterThan(8);

    for (const path of seen) {
      const value = path.endsWith('.at') || path.includes('.values[') ? 7 : 'changed';
      const next = applyPropertyChange(BAR, { owner: { role: 'chart', id: 'c' }, path, value });
      expect(next, `path ${path} did not change the source`).not.toBe(BAR);
    }
  });

  it('a bar path writes the value the bar stands for', () => {
    const next = applyPropertyChange(BAR, {
      owner: { role: 'chart', id: 'c' },
      path: 'Series[retail].values[1]',
      value: 99,
    });
    expect(chartOf(next).series[1].values).toEqual([40, 99]);
  });

  it('a legend path renames the series it sits next to', () => {
    const next = applyPropertyChange(BAR, {
      owner: { role: 'chart', id: 'c' },
      path: 'Series[online].label',
      value: 'Web',
    });
    expect(chartOf(next).series[0].label).toBe('Web');
    expect(chartOf(next).series[1].label).toBe('Retail');
  });

  it('the rendered svg reflects the patch', () => {
    const next = applyPropertyChange(BAR, { owner: { role: 'chart', id: 'c' }, path: 'text', value: 'Umsatz' });
    expect(svgOf(next)).toContain('Umsatz');
  });
});

describe('data-sf-prop — stacked bars are marked too', () => {
  it('marks each stacked segment', () => {
    const stacked = BAR.replace('stacked: none', 'stacked: true');
    const props = propsIn(svgOf(stacked));
    expect(props).toContain('Series[online].values[0]');
    expect(props).toContain('Series[retail].values[0]');
  });
});

describe('data-sf-prop — ids that cannot be addressed are skipped', () => {
  it('emits no prop for a series whose id is not an identifier', () => {
    const chart = chartOf(BAR);
    const svg = renderCanvas({
      shapes: [],
      frames: [],
      swimlanes: [],
      links: [],
      charts: [{ ...chart, series: [{ ...chart.series[0], id: 'not an ident' }] }],
    }).svg;
    expect(propsIn(svg)).not.toContain('Series[not an ident].values[0]');
    expect(propsIn(svg).some(prop => prop.startsWith('Series['))).toBe(false);
  });
});
