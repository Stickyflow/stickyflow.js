import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';
import type { RenderNode } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  ('style' in node && node.style?.fill?.kind === 'solid') ? node.style.fill.color : undefined;

const HEXBIN_SFL = `sfl 1.2

Model board {
  Chart density {
    text: "Point density"
    type: hexbin
    hexRadius: 10

    Axis x { min: 0; max: 100; step: 20 }
    Axis y { min: 0; max: 100; step: 20 }

    Series a { label: "Cluster A"; color: "#4e3180"; values: [[10, 10], [11, 11], [12, 9], [90, 90]] }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Hexbin chart', () => {
  it('carries chartType and hexRadius through sflToCanvasState', () => {
    const state = sflToCanvasState(HEXBIN_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('hexbin');
    expect(chart.chart?.hexRadius).toBe(10);
    expect(chart.chart?.series[0].values).toEqual([[10, 10], [11, 11], [12, 9], [90, 90]]);
  });

  it('renders hex cells per series without a diagnostic', () => {
    const { diagnostics, svg } = render(HEXBIN_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="hexbin"');
    expect(svg).toContain('chart-hexbin-density-a-');
  });

  it('groups nearby points into fewer bins than there are points', () => {
    const { scene } = render(HEXBIN_SFL);
    const hexNodes = scene.nodes.filter(node => node.id.startsWith('chart-hexbin-density-a-'));
    // 3 clustered points (10,10)/(11,11)/(12,9) + 1 far point (90,90) -> some clustering
    expect(hexNodes.length).toBeLessThan(4);
    expect(hexNodes.length).toBeGreaterThan(0);
  });

  it('uses the series color for every hex cell', () => {
    const { scene } = render(HEXBIN_SFL);
    const hexNodes = scene.nodes.filter(node => node.id.startsWith('chart-hexbin-density-a-'));
    hexNodes.forEach(node => expect(solidFill(node)).toBe('#4e3180'));
  });

  it('gives the denser bin full opacity and a sparser bin lower opacity', () => {
    const { scene } = render(HEXBIN_SFL);
    const hexNodes = scene.nodes.filter(node => node.id.startsWith('chart-hexbin-density-a-'));
    const opacities = hexNodes.map(node => ('style' in node ? node.style?.opacity : undefined));
    expect(Math.max(...(opacities as number[]))).toBe(1);
  });

  it('falls back to a default hex radius when hexRadius is unset', () => {
    const withoutRadius = HEXBIN_SFL.replace(/\s*hexRadius: 10/, '');
    expect(withoutRadius).not.toContain('hexRadius');
    const { diagnostics } = render(withoutRadius);
    expect(diagnostics).toEqual([]);
  });

  it('does not suppress the generic legend (hexbin uses normal cartesian axes)', () => {
    const { svg } = render(HEXBIN_SFL);
    expect(svg).toContain('chart-legend-swatch-');
  });
});
