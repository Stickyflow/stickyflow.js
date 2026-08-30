import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';
import type { RenderNode } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  ('style' in node && node.style?.fill?.kind === 'solid') ? node.style.fill.color : undefined;

const CUSTOM_SFL = `sfl 1.2

Model board {
  Chart marks {
    text: "Custom glyphs"
    type: custom

    Axis x { min: 0; max: 10; step: 2 }
    Axis y { min: 0; max: 10; step: 2 }

    Series triangle {
      label: "Milestones"
      color: "#4e3180"
      stroke: "#1e1b4b"
      strokeWidth: 2
      symbol: [[-4, -4], [4, -4], [0, 4]]
      values: [[2, 2], [8, 8]]
    }
    Series plain {
      label: "Plain points"
      values: [[5, 5]]
    }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Custom chart', () => {
  it('carries chartType and per-series symbol/stroke through sflToCanvasState', () => {
    const state = sflToCanvasState(CUSTOM_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('custom');
    expect(chart.chart?.series[0].symbol?.points).toEqual([[-4, -4], [4, -4], [0, 4]]);
    expect(chart.chart?.series[0].stroke).toBe('#1e1b4b');
    expect(chart.chart?.series[0].strokeWidth).toBe(2);
  });

  it('draws one polygon glyph per data point for a series with a symbol, without a diagnostic', () => {
    const { diagnostics, svg } = render(CUSTOM_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="custom"');
    expect(svg).toContain('chart-custom-mark-marks-triangle-0');
    expect(svg).toContain('chart-custom-mark-marks-triangle-1');
  });

  it('uses the series color and stroke for its glyph fill/outline', () => {
    const { scene } = render(CUSTOM_SFL);
    const mark = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-triangle-0');
    expect(mark && solidFill(mark)).toBe('#4e3180');
    expect(mark?.type === 'path' && mark.style?.stroke?.kind === 'solid' && mark.style.stroke.color).toBe('#1e1b4b');
  });

  it('falls back to a plain dot for a series without a symbol', () => {
    const { scene } = render(CUSTOM_SFL);
    const mark = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-plain-0');
    expect(mark?.type).toBe('ellipse');
  });
});
