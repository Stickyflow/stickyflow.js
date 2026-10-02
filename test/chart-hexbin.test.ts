import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;

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
    const chart = state.canvasObjects[0];
    expect(chart.chart?.chartType).toBe('hexbin');
    expect(chart.chart?.hexRadius).toBe(10);
    expect(chart.chart?.series[0].values).toEqual([
      [10, 10],
      [11, 11],
      [12, 9],
      [90, 90],
    ]);
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
    hexNodes.forEach(node => {
      expect(solidFill(node)).toBe('#4e3180');
    });
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

describe('Hexbin chart â€” binning is anchored to the plot, not the canvas', () => {
  const at = (x: number, y: number, width = 400, height = 260) => `sfl 1.4

Model M {
  Chart c {
    type: hexbin
    hexRadius: 14
    Axis x { min: 0; max: 100; step: 20 }
    Axis y { min: 0; max: 100; step: 20 }
    Series a { color: "#6d5ef0"; values: [[20, 20], [24, 26], [30, 22], [28, 30], [70, 70], [74, 66], [22, 24]] }
    layout { position: ${x}, ${y}; size: ${width}, ${height} }
  }
}`;

  const cellShape = (svg: string) =>
    [...svg.matchAll(/chart-hexbin-c-a-\d+"[^>]*opacity="([\d.]+)"/g)].map(match => match[1]);

  const cellOffsets = (svg: string) =>
    [...svg.matchAll(/chart-hexbin-c-a-\d+"[^>]*\sd="M ([\d.-]+) ([\d.-]+)/g)].map(match => [
      Number(match[1]),
      Number(match[2]),
    ]);

  it('produces the same cells and densities wherever the chart sits', () => {
    const origin = cellShape(render(at(0, 0)).svg);
    expect(origin.length).toBeGreaterThan(1);
    for (const [x, y] of [
      [37, 11],
      [200, 90],
      [-15, 7],
    ]) {
      expect(cellShape(render(at(x, y)).svg)).toEqual(origin);
    }
  });

  it('translates the cells by exactly the move, without re-binning', () => {
    const origin = cellOffsets(render(at(0, 0)).svg);
    const moved = cellOffsets(render(at(40, 25)).svg);
    expect(moved).toHaveLength(origin.length);
    moved.forEach(([x, y], index) => {
      expect(x - origin[index][0]).toBeCloseTo(40, 6);
      expect(y - origin[index][1]).toBeCloseTo(25, 6);
    });
  });
});
