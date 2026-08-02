import { describe, expect, it } from 'vitest';
import { render, renderCanvas, sflToCanvasState, sflToRenderInput } from '../src/index';
import type { RenderInput } from '../src/index';

const CHART_SFL = `sfl 1.2

Model board {
  Chart chart {
    text: "Dotted Chart"
    type: scatter
    Axis x {
      label: "Sekunde pro Minute"
      min: 0
      max: 4
      step: 1
    }
    Axis y {
      label: "DB"
      min: 0
      max: 500
      step: 100
    }
    Series series_4 {
      color: "#4e3180"
      label: "2028"
      values: [[0, 24], [1.3, 89], [2.7, 154], [3, 297]]
    }
    layout {
      position: 100, 50
      size: 997, 404
      order: 0
    }
    style {
      fill: "#ebf1e5"
      gridColor: "#60a5fa"
    }
  }
}`;

describe('Chart and Path parity', () => {
  it('keeps chart axes, series and explicit x/y values through the SFL pipeline', () => {
    const state = sflToCanvasState(CHART_SFL);
    const chart = state.entities[0];
    expect(chart.entityType).toBe('chart');
    expect(chart.chart?.chartType).toBe('scatter');
    expect(chart.chart?.series[0].values).toEqual([[0, 24], [1.3, 89], [2.7, 154], [3, 297]]);

    const input = sflToRenderInput(CHART_SFL);
    expect(input.charts?.[0].title).toBe('Dotted Chart');
    expect(input.charts?.[0].grid_color).toBe('#60a5fa');
    const { svg } = render(CHART_SFL);
    expect(svg).toContain('data-sf-role="chart"');
    expect(svg).toContain('Dotted Chart');
    expect(svg).toContain('Sekunde pro Minute');
    expect(svg).toContain('2028');
    expect(svg).toContain('#4e3180');
  });

  it('renders explicit line x coordinates and remains compatible with legacy flat values', () => {
    const base = {
      id: 'line', x: 0, y: 0, width: 500, height: 300, title: 'Line', chart_type: 'line' as const,
      axis_x: { min: 0, max: 4, step: 1 }, axis_y: { min: 0, max: 500, step: 100 },
      fill_color: '#fff', stroke_color: '#000', text_color: '#111', series: [
        { id: 'explicit', label: 'Explicit', values: [[0, 24], [1.3, 89], [2.7, 154]] as [number, number][] },
        { id: 'legacy', label: 'Legacy', values: [24, 89, 154] },
      ],
    };
    const { scene } = renderCanvas({ shapes: [], frames: [], swimlanes: [], links: [], charts: [base] } as RenderInput);
    const explicit = scene.nodes.find(node => node.id === 'chart-line-line-explicit');
    const legacy = scene.nodes.find(node => node.id === 'chart-line-line-legacy');
    expect(explicit?.type === 'path' && explicit.d).toContain('185.75');
    expect(legacy?.type === 'path' && legacy.d).toContain('153.5');
  });

  it('renders curved, closed paths with fill and markers', () => {
    const source = `sfl 1.2
Model board {
  Path route {
    points: [[10, 10], [100, 20], [80, 120]]
    tension: 0.5
    closed: true
    startMarker: arrow
    endMarker: filled_arrow
    layout {
      position: 10, 10
      size: 90, 110
      order: 0
    }
    style {
      stroke: "#7c3aed"
      fill: "#ede9fe"
      strokeWidth: 3
    }
  }
}`;
    const state = sflToCanvasState(source);
    expect(state.entities[0].entityType).toBe('path');
    expect(state.entities[0].path?.points).toHaveLength(3);
    const { svg } = render(source);
    expect(svg).toContain('data-sf-role="path"');
    expect(svg).toContain('fill="#ede9fe"');
    expect(svg).toContain('marker-start=');
    expect(svg).toContain('marker-end=');
    expect(svg).toMatch(/d="M 10 10 C [^"]+ Z"/);
  });
});
