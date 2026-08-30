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
    const markIds = scene.nodes.filter(node =>
      node.id.startsWith('chart-bar-') || node.id.startsWith('chart-line-') || node.id.startsWith('chart-point-')
    );
    expect(markIds).toEqual([]);
  });

  it('still anchors other elements to it as a plain coordinate frame (frame itself renders as its own rect)', () => {
    const { scene } = render(GRID_SFL);
    expect(scene.nodes.find(node => node.id === 'chart-frame')).toBeDefined();
  });
});
