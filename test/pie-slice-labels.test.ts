import { describe, expect, it } from 'vitest';
import { render } from '../src/index';
import { applyChartValueChange } from '../src/runtime/interaction';

const pieOf = (values: number[], showAxisLabels?: boolean) => `sfl 1.4

Model M {
  Chart c {
    type: pie
    ${showAxisLabels === false ? 'style { showAxisLabels: false }' : ''}
    ${values.map((v, i) => `Series s${i} { color: "#6d5ef0"; label: "Slice ${i}"; values: [${v}] }`).join('\n    ')}
    layout { position: 0, 0; size: 300, 300 }
  }
}
`;

function labelNode(svg: string, seriesId: string): string {
  const match = svg.match(new RegExp(`<text id="sf-chart-pie-label-c-${seriesId}"[\\s\\S]*?</text>`));
  if (!match) {
    throw new Error(`no label for series "${seriesId}" in output`);
  }
  return match[0];
}

describe('pie chart — in-slice labels', () => {
  it('shows the series label and its share of the total, rounded', () => {
    const svg = render(pieOf([60, 40])).svg;
    expect(labelNode(svg, 's0')).toMatch(/<tspan[^>]*>Slice 0<\/tspan>/);
    expect(labelNode(svg, 's0')).toContain('60%');
    expect(labelNode(svg, 's1')).toContain('40%');
  });

  it('omits the label on a slice too thin to hold one', () => {
    const svg = render(pieOf([60, 39, 1])).svg;
    expect(svg).toContain('sf-chart-pie-label-c-s0');
    expect(svg).toContain('sf-chart-pie-label-c-s1');
    expect(svg).not.toContain('sf-chart-pie-label-c-s2');
  });

  it('respects showAxisLabels: false, same toggle every other chart type uses', () => {
    const svg = render(pieOf([60, 40], false)).svg;
    expect(svg).not.toContain('sf-chart-pie-label-c-s0');
    expect(svg).not.toContain('sf-chart-pie-label-c-s1');
  });

  it('picks a readable text color against each slice, not a fixed one', () => {
    const svg = render(`sfl 1.4

Model M {
  Chart c {
    type: pie
    Series a { color: "#000000"; label: "Dark"; values: [50] }
    Series b { color: "#ffffff"; label: "Light"; values: [50] }
    layout { position: 0, 0; size: 300, 300 }
  }
}
`).svg;
    expect(labelNode(svg, 'a')).toContain('fill="#ffffff"');
    expect(labelNode(svg, 'b')).toContain('fill="#0f172a"');
  });
});

describe('pie chart — a slice dragged down to zero', () => {
  const sliceNode = (svg: string, seriesId: string) =>
    svg.match(new RegExp(`<path id="sf-chart-pie-slice-c-${seriesId}"[^>]*>`))?.[0] ?? null;

  it('keeps the emptied slice in the output instead of dropping it', () => {
    const svg = render(pieOf([60, 40, 0])).svg;
    expect(sliceNode(svg, 's2')).not.toBeNull();
    expect(sliceNode(svg, 's2')).toContain('data-sf-pie-value="0"');
  });

  it('gives it no sweep, so it paints nothing while it sits at zero', () => {
    const svg = render(pieOf([60, 40, 0])).svg;
    const node = sliceNode(svg, 's2') ?? '';
    const start = Number(node.match(/data-sf-pie-start="([^"]+)"/)?.[1]);
    const end = Number(node.match(/data-sf-pie-end="([^"]+)"/)?.[1]);
    expect(end).toBe(start);
  });

  it('leaves it addressable between its neighbours, so a drag can grow it back', () => {
    const svg = render(pieOf([60, 0, 40])).svg;
    const starts = ['s0', 's1', 's2'].map(id =>
      Number((sliceNode(svg, id) ?? '').match(/data-sf-pie-start="([^"]+)"/)?.[1]),
    );
    expect(starts[1]).toBeGreaterThan(starts[0]);
    expect(starts[2]).toBe(starts[1]);
  });

  it('drops only its in-slice label, which no longer fits', () => {
    const svg = render(pieOf([60, 40, 0])).svg;
    expect(svg).not.toContain('sf-chart-pie-label-c-s2');
  });
});

describe('pie chart — the drag round trip through the source', () => {
  const owner = { role: 'chart', id: 'c' } as const;

  it('writes both sides of one drag back, conserving what the pair had', () => {
    const source = pieOf([58, 37, 5]);
    const patched = applyChartValueChange(applyChartValueChange(source, { owner, series: 's0', index: 0, value: 80 }), {
      owner,
      series: 's1',
      index: 0,
      value: 15,
    });
    expect(patched).toContain('values: [80]');
    expect(patched).toContain('values: [15]');
    expect(patched).toContain('values: [5]');
  });

  it('survives a slice being pushed to zero, and can be grown back afterwards', () => {
    const source = pieOf([58, 37, 5]);
    const emptied = applyChartValueChange(applyChartValueChange(source, { owner, series: 's0', index: 0, value: 95 }), {
      owner,
      series: 's1',
      index: 0,
      value: 0,
    });
    expect(emptied).toContain('values: [0]');

    const svg = render(emptied).svg;
    expect(svg).toContain('sf-chart-pie-slice-c-s1');

    const regrown = applyChartValueChange(emptied, { owner, series: 's1', index: 0, value: 20 });
    expect(render(regrown).svg).toContain('sf-chart-pie-label-c-s1');
  });
});
