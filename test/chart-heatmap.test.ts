import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';
import type { RenderNode } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  ('style' in node && node.style?.fill?.kind === 'solid') ? node.style.fill.color : undefined;

// Heatmap ported from stickyflow-atlas's buildHeatmapMarks (this package's
// first chart type added after the initial six) - config.categories are
// column headers (reusing the field radar already uses for its own category
// labels, not a chart-family-specific spot on Axis), each Series is one row,
// and axis_y.thresholds + config.zones bucket a cell's value into a color band.

const HEATMAP_SFL = `sfl 1.2

Model board {
  Chart activity {
    text: "Weekly activity"
    type: heatmap
    categories: ["Mon", "Tue", "Wed"]
    zones: [["Low", "#ddd6fe"], ["Medium", "#a78bfa"], ["High", "#6d28d9"]]

    Axis x { min: 0; max: 1; step: 1 }
    Axis y {
      min: 0
      max: 10
      step: 1
      thresholds: [3, 7]
    }

    Series morning { label: "Morning"; values: [1, 5, 9] }
    Series evening { label: "Evening"; values: [8, 2, 6] }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Heatmap chart', () => {
  it('carries zones and axis thresholds through sflToCanvasState', () => {
    const state = sflToCanvasState(HEATMAP_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('heatmap');
    expect(chart.chart?.zones).toEqual([
      { label: 'Low', color: '#ddd6fe' },
      { label: 'Medium', color: '#a78bfa' },
      { label: 'High', color: '#6d28d9' },
    ]);
    expect(chart.chart?.axisY.thresholds).toEqual([3, 7]);
    expect(chart.chart?.categories).toEqual(['Mon', 'Tue', 'Wed']);
  });

  it('renders every cell without a diagnostic', () => {
    const { diagnostics, svg } = render(HEATMAP_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-role="chart"');
    expect(svg).toContain('data-sf-kind="heatmap"');
  });

  it('buckets each cell into the correct zone color : 1<3 low, 5 in [3,7) medium, 9>=7 high', () => {
    const { scene } = render(HEATMAP_SFL);
    const cells = scene.nodes.filter(node => node.id.startsWith('chart-heatmap-cell-') && node.type === 'rect');
    // Morning row: [1, 5, 9] -> low, medium, high
    const morning = cells.filter(node => node.id.includes('-morning-'));
    expect(morning.map(solidFill)).toEqual(['#ddd6fe', '#a78bfa', '#6d28d9']);
  });

  it('labels rows from Series.label and columns from config.categories', () => {
    const { svg } = render(HEATMAP_SFL);
    expect(svg).toContain('>Morning<');
    expect(svg).toContain('>Evening<');
    expect(svg).toContain('>Mon<');
    expect(svg).toContain('>Tue<');
    expect(svg).toContain('>Wed<');
  });

  it('draws a zone legend with the band range in each label', () => {
    const { svg } = render(HEATMAP_SFL);
    expect(svg).toContain('Low (0-3)');
    expect(svg).toContain('Medium (3-7)');
    expect(svg).toContain('High (7-10)');
  });

  it('falls back to the default three-zone palette when zones is omitted', () => {
    const noZones = HEATMAP_SFL.replace(/zones: \[.*\]\n\s*/, '');
    const { diagnostics, svg } = render(noZones);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('#ddd6fe');
  });

  it('does not draw the generic numeric axis grid/ticks a cartesian chart would get', () => {
    const { svg } = render(HEATMAP_SFL);
    expect(svg).not.toContain('chart-grid-x-');
    expect(svg).not.toContain('chart-grid-y-');
    expect(svg).not.toContain('chart-x-tick-');
    expect(svg).not.toContain('chart-y-tick-');
  });
});
