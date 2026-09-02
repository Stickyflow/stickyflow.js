import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;

const MATRIX_SFL = `sfl 1.2

Model board {
  Chart priority {
    text: "Effort vs impact"
    type: matrix
    zones: [["Low priority", "#f1f5f9"], ["Quick wins", "#dbeafe"], ["Major projects", "#fef3c7"], ["Fill-ins", "#e0e7ff"]]

    Axis x { min: 0; max: 10; step: 5; thresholds: [5] }
    Axis y { min: 0; max: 10; step: 5; thresholds: [5] }

    Series a { label: "Feature A"; color: "#4e3180"; size: 8; values: [[2, 8]] }
    Series b { label: "Feature B"; values: [[8, 2]] }

    layout {
      position: 0, 0
      size: 400, 300
    }
  }
}`;

describe('Matrix chart', () => {
  it('carries chartType, zones and per-series point/size through sflToCanvasState', () => {
    const state = sflToCanvasState(MATRIX_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('matrix');
    expect(chart.chart?.zones?.length).toBe(4);
    expect(chart.chart?.series[0].values).toEqual([[2, 8]]);
    expect(chart.chart?.series[0].size).toBe(8);
  });

  it('renders quadrant backgrounds and one point per series without a diagnostic', () => {
    const { diagnostics, svg } = render(MATRIX_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="matrix"');
    expect(svg).toContain('chart-matrix-zone-priority-0-0');
    expect(svg).toContain('chart-matrix-point-priority-a');
    expect(svg).toContain('chart-matrix-point-priority-b');
  });

  it('uses each series own color and size for its point marker', () => {
    const { scene } = render(MATRIX_SFL);
    const pointA = scene.nodes.find(node => node.id === 'chart-matrix-point-priority-a');
    expect(pointA && solidFill(pointA)).toBe('#4e3180');
    expect(pointA?.type === 'ellipse' && pointA.rx).toBe(8);
  });

  it('places a low-x/high-y point in the top-left quadrant cell', () => {
    const { scene } = render(MATRIX_SFL);
    const pointA = scene.nodes.find(node => node.id === 'chart-matrix-point-priority-a');
    const zoneTopLeft = scene.nodes.find(node => node.id === 'chart-matrix-zone-priority-0-1');
    expect(pointA?.type === 'ellipse' && zoneTopLeft?.type === 'rect').toBe(true);
    if (pointA?.type === 'ellipse' && zoneTopLeft?.type === 'rect') {
      expect(pointA.cx).toBeGreaterThanOrEqual(zoneTopLeft.x);
      expect(pointA.cx).toBeLessThanOrEqual(zoneTopLeft.x + zoneTopLeft.width);
      expect(pointA.cy).toBeGreaterThanOrEqual(zoneTopLeft.y);
      expect(pointA.cy).toBeLessThanOrEqual(zoneTopLeft.y + zoneTopLeft.height);
    }
  });

  it('suppresses the generic per-series legend and numeric axis ticks', () => {
    const { svg } = render(MATRIX_SFL);
    expect(svg).not.toContain('chart-legend-swatch-');
    expect(svg).not.toContain('chart-x-tick-');
  });

  it('skips zone backgrounds entirely when config.zones is unset', () => {
    const noZones = MATRIX_SFL.replace(/zones:.*\n/, '');
    expect(noZones).not.toContain('zones:');
    const { diagnostics, svg } = render(noZones);
    expect(diagnostics).toEqual([]);
    expect(svg).not.toContain('chart-matrix-zone-');
  });
});
