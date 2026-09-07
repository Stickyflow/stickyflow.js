import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const chart = (type: string, color: string, extra = '') => `sfl 1.4

Model M {
  Chart c {
    type: ${type}
    Axis x { min: 0; max: 4; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series a { color: "${color}"; values: [60, 62, 58, 65] ${extra} }
    layout { position: 0, 0; size: 340, 220 }
  }
}
`;

const GRADIENT = 'gradient(45, #7c3aed 0%, #ec4899 100%)';

describe('Series.color as a gradient', () => {
  it('renders a real <linearGradient> def and points the mark fill at it, not a broken literal', () => {
    const { svg, diagnostics } = render(chart('bar', GRADIENT));
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('<linearGradient');
    const bar = svg.match(/<path id="sf-chart-bar-c-a-0"[^>]*>/)?.[0];
    expect(bar).toMatch(/fill="url\(#[^)]+\)"/);
    expect(bar).not.toContain('fill="gradient(');
  });

  it('still accepts a plain hex string exactly as before (no regression)', () => {
    const { svg, diagnostics } = render(chart('bar', '#7c3aed'));
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('<path id="sf-chart-bar-c-a-0"');
    expect(svg).not.toContain('<linearGradient');
    const bar = svg.match(/<path id="sf-chart-bar-c-a-0"[^>]*>/)?.[0];
    expect(bar).toContain('fill="#7c3aed"');
  });

  it('paints a line stroke as a gradient too', () => {
    const { svg } = render(chart('line', GRADIENT));
    const line = svg.match(/<path id="sf-chart-line-c-a"[^>]*>/)?.[0];
    expect(line).toMatch(/stroke="url\(#[^)]+\)"/);
  });

  it('paints a pie slice as a gradient', () => {
    const { svg } = render(chart('pie', GRADIENT));
    const slice = svg.match(/<path id="sf-chart-pie-slice-c-a"[^>]*>/)?.[0];
    expect(slice).toMatch(/fill="url\(#[^)]+\)"/);
  });

  it("falls back to the gradient's first stop for contexts that can only paint a flat color", () => {
    // Contrast calculation requires a representative solid color.
    const sfl = `sfl 1.4

Model M {
  Chart c {
    type: treemap
    Axis x { min: 0; max: 4; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series a { color: "${GRADIENT}"; values: [80]; label: "A" }
    layout { position: 0, 0; size: 340, 220 }
  }
}
`;
    const { svg, diagnostics } = render(sfl);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('chart-treemap-tile-c-a');
    expect(svg).toContain('chart-treemap-label-c-a');
  });

  it('renders a sankey flow with a flat representative color, not a broken gradient literal', () => {
    // Sankey layout carries a single solid color per flow.
    const sfl = `sfl 1.4

Model M {
  Chart c {
    type: sankey
    zones: [["Source", "#334155"], ["Target", "#334155"]]
    Axis x { min: 0; max: 4; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series flow { color: "${GRADIENT}"; source: "Source"; target: "Target"; values: [10] }
    layout { position: 0, 0; size: 480, 260 }
  }
}
`;
    const { svg, diagnostics } = render(sfl);
    expect(diagnostics).toEqual([]);
    const link = svg.match(/<path id="sf-chart-sankey-link-c-0"[^>]*>/)?.[0];
    expect(link).toContain('fill="#7c3aed"');
    expect(link).not.toContain('fill="gradient(');
  });
});
