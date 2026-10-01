import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const lineOf = () => `sfl 1.4

Model M {
  Chart c {
    type: line
    categories: ["Q1", "Q2", "Q3"]
    Axis x { min: 0; max: 3; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series online { color: "#6d5ef0"; values: [10, 20, 30] }
    Series retail { color: "#db2777"; values: [5, 15, 25] }
    layout { position: 0, 0; size: 300, 200 }
  }
}
`;

function linePath(svg: string, series: string): string {
  const match = svg.match(new RegExp(`<path[^>]*data-sf-series="${series}"[^>]*>`));
  if (!match) {
    throw new Error(`no line path for series "${series}" in output`);
  }
  return match[0];
}

const linedOf = (tension: number) => `sfl 1.4

Model M {
  Chart c {
    type: line
    lineTension: ${tension}
    categories: ["Q1", "Q2", "Q3"]
    Axis x { min: 0; max: 3; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series online { color: "#6d5ef0"; values: [10, 20, 30] }
    layout { position: 0, 0; size: 300, 200 }
  }
}
`;

describe('line chart — connecting path contract', () => {
  it('carries data-sf-id and data-sf-series, addressable independent of its own id', () => {
    const svg = render(lineOf()).svg;
    const line = linePath(svg, 'online');
    expect(line).toContain('data-sf-id="c"');
    expect(line).toContain('data-sf-series="online"');
  });

  it('draws a plain M/L polyline, unconfigured, byte-identical to before lineTension existed', () => {
    const line = linePath(render(lineOf()).svg, 'online');
    expect(line).toContain('d="M  46 153.8 L 122.66666666666666 141.6 L 199.33333333333331 129.4"');
    expect(line).not.toContain('data-sf-line-tension');
  });

  it('draws a curved path and carries its own tension once configured', () => {
    const line = linePath(render(linedOf(0.5)).svg, 'online');
    expect(line).toContain('data-sf-line-tension="0.5"');
    expect(line).toMatch(/d="M [\d.]+ [\d.]+ C /);
  });

  it('lineTension: 0 renders exactly like leaving it unset', () => {
    const line = linePath(render(linedOf(0)).svg, 'online');
    expect(line).not.toContain('data-sf-line-tension');
    expect(line).toContain('d="M  46 153.8 L 122.66666666666666 141.6 L 199.33333333333331 129.4"');
  });

  it('distinguishes each series line when a chart has more than one', () => {
    const svg = render(lineOf()).svg;
    expect(linePath(svg, 'online')).not.toBe(linePath(svg, 'retail'));
  });

  it('stays addressable by data-sf-* attributes even once idPrefix mutates its id', () => {
    const svg = render(lineOf(), { idPrefix: 'r1' }).svg;
    const line = linePath(svg, 'online');
    expect(line).toContain('id="sf-r1-chart-line-c-online"');
    expect(line).toContain('data-sf-id="c"');
    expect(line).toContain('data-sf-series="online"');
  });
});
