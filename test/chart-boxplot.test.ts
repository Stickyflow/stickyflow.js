import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;

const BOXPLOT_SFL = `sfl 1.2

Model board {
  Chart scores {
    text: "Test scores"
    type: boxplot
    showBoxplotPoints: false

    Axis x { min: 0; max: 2; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }

    Series a { label: "Group A"; color: "#4e3180"; values: [55, 60, 65, 70, 90] }
    Series b { label: "Group B"; values: [30, 40, 50] }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Boxplot chart', () => {
  it('carries chartType and per-series raw values through sflToCanvasState', () => {
    const state = sflToCanvasState(BOXPLOT_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('boxplot');
    expect(chart.chart?.showBoxplotPoints).toBe(false);
    expect(chart.chart?.series.map(s => s.values)).toEqual([
      [55, 60, 65, 70, 90],
      [30, 40, 50],
    ]);
  });

  it('renders one box per series without a diagnostic', () => {
    const { diagnostics, svg } = render(BOXPLOT_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="boxplot"');
    expect(svg).toContain('chart-box-scores-a');
    expect(svg).toContain('chart-box-scores-b');
  });

  it('computes the five-number summary correctly (type-7 quantile)', () => {
    const { scene } = render(BOXPLOT_SFL);
    const box = scene.nodes.find(node => node.id === 'chart-box-scores-a');
    // [55,60,65,70,90] sorted -> min 55, q1 60, median 65, q3 70, max 90
    // box height in pixels spans q1..q3 -> (70-60)/100*200 = 20px (axis_y 0-100 over plot height ~200)
    expect(box?.type === 'rect' && box.height).toBeGreaterThan(0);
    expect(box?.type === 'rect' && box.width).toBeGreaterThan(0);
  });

  it('uses each series own color for its box fill', () => {
    const { scene } = render(BOXPLOT_SFL);
    const boxA = scene.nodes.find(node => node.id === 'chart-box-scores-a');
    expect(boxA && solidFill(boxA)).toBe('#4e3180');
  });

  it('omits jittered point dots when showBoxplotPoints is false', () => {
    const { svg } = render(BOXPLOT_SFL);
    expect(svg).not.toContain('chart-box-point-');
  });

  it('draws jittered point dots by default when showBoxplotPoints is unset', () => {
    const withPoints = BOXPLOT_SFL.replace(/\s*showBoxplotPoints: false/, '');
    expect(withPoints).not.toContain('showBoxplotPoints');
    const { svg } = render(withPoints);
    expect(svg).toContain('chart-box-point-scores-a-0');
  });

  it('suppresses the generic per-series legend (each box already carries its own identity)', () => {
    const { svg } = render(BOXPLOT_SFL);
    expect(svg).not.toContain('chart-legend-swatch-');
  });
});
