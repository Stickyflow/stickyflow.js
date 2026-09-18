import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

const GRID_SFL = `sfl 1.2

Model board {
  Chart frame {
    text: "Coordinate frame"
    type: grid

    Axis x { min: 0; max: 100; step: 20; label: "Weeks" }
    Axis y { min: 0; max: 10; step: 2; label: "Team" }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Grid chart', () => {
  it('carries chartType through sflToCanvasState with no series required', () => {
    const state = sflToCanvasState(GRID_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('grid');
    expect(chart.chart?.series).toEqual([]);
  });

  it('renders the coordinate frame (axis grid + tick labels) without a diagnostic', () => {
    const { diagnostics, svg } = render(GRID_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="grid"');
    expect(svg).toContain('chart-grid-x-frame-');
    expect(svg).toContain('chart-x-tick-frame-');
  });

  it('draws no marks at all since it has no series', () => {
    const { scene } = render(GRID_SFL);
    const markIds = scene.nodes.filter(
      node =>
        node.id.startsWith('chart-bar-') || node.id.startsWith('chart-line-') || node.id.startsWith('chart-point-'),
    );
    expect(markIds).toEqual([]);
  });

  it('still anchors other elements to it as a plain coordinate frame (frame itself renders as its own rect)', () => {
    const { scene } = render(GRID_SFL);
    expect(scene.nodes.find(node => node.id === 'chart-frame')).toBeDefined();
  });

  it('falls back to plain points when series are given, same shape as scatter but a smaller radius', () => {
    const withSeries = GRID_SFL.replace(
      '    layout {',
      '    Series a { label: "A"; values: [[10, 4], [30, 6]] }\n\n    layout {',
    );
    const { diagnostics, scene } = render(withSeries);
    expect(diagnostics).toEqual([]);
    const points = scene.nodes.filter(node => node.id.startsWith('chart-point-frame-a-'));
    expect(points).toHaveLength(2);
    expect(points.every(point => point.type === 'ellipse' && point.rx === 3)).toBe(true);
  });

  it('respects showGrid: false, same toggle every other chart type uses', () => {
    const noGrid = GRID_SFL.replace('type: grid', 'type: grid\n    style { showGrid: false }');
    const { svg } = render(noGrid);
    expect(svg).not.toContain('chart-grid-x-frame-');
  });

  it('shows the generic per-series legend when series are given, unlike chart types with their own legend', () => {
    const withSeries = GRID_SFL.replace(
      '    layout {',
      '    Series a { label: "A"; values: [[10, 4]] }\n\n    layout {',
    );
    const { svg } = render(withSeries);
    expect(svg).toContain('chart-legend-swatch-');
  });
});
