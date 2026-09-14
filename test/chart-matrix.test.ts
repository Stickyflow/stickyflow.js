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

  it('falls back to the default four-quadrant palette when config.zones is unset', () => {
    const noZones = MATRIX_SFL.replace(/zones:.*\n/, '');
    expect(noZones).not.toContain('zones:');
    const { diagnostics, svg } = render(noZones);
    expect(diagnostics).toEqual([]);
    expect(svg.match(/chart-matrix-zone-priority-\d-\d"/g)).toHaveLength(4);
    expect(svg).toContain('>Eliminate<');
    expect(svg).toContain('>Delegate<');
    expect(svg).toContain('>Schedule<');
    expect(svg).toContain('>Do First<');
  });

  it('labels a light pastel zone with a darker shade of its own hue, not a flat neutral black', () => {
    const noZones = MATRIX_SFL.replace(/zones:.*\n/, '');
    const { svg } = render(noZones);
    const eliminateLabel = svg.match(/<text id="[^"]*chart-matrix-zone-label-priority-0-0"[^>]*>/)?.[0];
    expect(eliminateLabel).toContain('fill="#096729"');
    expect(eliminateLabel).not.toContain('fill="#0f172a"');
  });

  it('renders a full NxN grid beyond a plain 2x2 (2 thresholds per axis -> 3x3, 9 zones)', () => {
    const nineZones = Array.from({ length: 9 }, (_, i) => `["Z${i}", "#e2e8f0"]`).join(', ');
    const grid = MATRIX_SFL.replace(/zones:.*/, `zones: [${nineZones}]`).replace(
      /thresholds: \[5\]/g,
      'thresholds: [3, 7]',
    );
    const { diagnostics, svg } = render(grid);
    expect(diagnostics).toEqual([]);
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        expect(svg).toContain(`chart-matrix-zone-priority-${x}-${y}`);
      }
    }
    expect(svg.match(/chart-matrix-divider-x-priority-\d/g)).toHaveLength(2);
    expect(svg.match(/chart-matrix-divider-y-priority-\d/g)).toHaveLength(2);
  });

  it('exposes each point as a draggable chart value (data-sf-series/value-index), same as scatter', () => {
    const { svg } = render(MATRIX_SFL);
    const pointA = svg.match(/<ellipse id="[^"]*chart-matrix-point-priority-a"[^>]*>/)?.[0];
    expect(pointA).toContain('data-sf-series="a" data-sf-value-index="0"');
  });

  it('point borders use the theme grid color, not a hardcoded white', () => {
    const themed = MATRIX_SFL.replace('type: matrix', 'type: matrix\n    style { gridColor: "#475569" }');
    const { svg } = render(themed);
    const point = svg.match(/<ellipse id="[^"]*chart-matrix-point-priority-a"[^>]*>/)?.[0];
    expect(point).toContain('stroke="#475569"');
  });

  it('cellGap insets each quadrant and rounds it to match, honoring an explicit barCornerRadius override', () => {
    const plain = render(MATRIX_SFL).svg;
    const plainZone = plain.match(/<rect id="[^"]*chart-matrix-zone-priority-0-0"[^>]*>/)?.[0];
    expect(plainZone).not.toContain('rx=');

    const gapped = MATRIX_SFL.replace('type: matrix', 'type: matrix\n    cellGap: 8');
    const gappedSvg = render(gapped).svg;
    const gappedZone = gappedSvg.match(/<rect id="[^"]*chart-matrix-zone-priority-0-0"[^>]*>/)?.[0];
    expect(gappedZone).toContain('rx="8"');
    const [, plainW] = plainZone?.match(/ width="([\d.]+)"/) ?? [];
    const [, gappedW] = gappedZone?.match(/ width="([\d.]+)"/) ?? [];
    expect(Number(gappedW)).toBeCloseTo(Number(plainW) - 8);

    const square = MATRIX_SFL.replace('type: matrix', 'type: matrix\n    cellGap: 8\n    barCornerRadius: 0');
    const squareZone = render(square).svg.match(/<rect id="[^"]*chart-matrix-zone-priority-0-0"[^>]*>/)?.[0];
    expect(squareZone).not.toContain('rx=');
  });
});
