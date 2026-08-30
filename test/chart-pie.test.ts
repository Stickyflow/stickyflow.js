import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';
import type { RenderNode } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  ('style' in node && node.style?.fill?.kind === 'solid') ? node.style.fill.color : undefined;

const PIE_SFL = `sfl 1.2

Model board {
  Chart share {
    text: "Market share"
    type: pie

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 1; step: 1 }

    Series a { label: "A"; color: "#4e3180"; values: [30] }
    Series b { label: "B"; values: [70] }

    layout {
      position: 0, 0
      size: 300, 200
    }
  }
}`;

describe('Pie chart', () => {
  it('carries chartType through sflToCanvasState', () => {
    const state = sflToCanvasState(PIE_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('pie');
    expect(chart.chart?.series.map(s => s.values)).toEqual([[30], [70]]);
  });

  it('renders one slice per series without a diagnostic', () => {
    const { diagnostics, svg } = render(PIE_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="pie"');
    expect(svg).toContain('chart-pie-slice-share-a');
    expect(svg).toContain('chart-pie-slice-share-b');
  });

  it('uses each series own color for its slice', () => {
    const { scene } = render(PIE_SFL);
    const sliceA = scene.nodes.find(node => node.id === 'chart-pie-slice-share-a');
    expect(sliceA && solidFill(sliceA)).toBe('#4e3180');
  });

  it('keeps the generic per-series legend (each slice already carries its own identity via the legend)', () => {
    const { svg } = render(PIE_SFL);
    expect(svg).toContain('chart-legend-swatch-share-a');
  });

  it('draws a full-circle path without degenerating when a single series holds 100%', () => {
    const single = `sfl 1.2
Model M {
  Chart c {
    type: pie
    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 1; step: 1 }
    Series only { values: [42] }
    layout { position: 0, 0; size: 200, 200 }
  }
}`;
    const { diagnostics, scene } = render(single);
    expect(diagnostics).toEqual([]);
    const slice = scene.nodes.find(node => node.id === 'chart-pie-slice-c-only');
    expect(slice?.type === 'path' && slice.d.length).toBeGreaterThan(0);
  });

  it('punches a donut hole when config.innerRadius is set', () => {
    const donut = PIE_SFL.replace('type: pie', 'type: pie\n    innerRadius: 30');
    const { svg } = render(donut);
    // A donut slice's path uses two arcs (outer + inner); a plain pie slice uses one arc + a line to center.
    expect((svg.match(/A /g) ?? []).length).toBeGreaterThan(2);
  });
});
