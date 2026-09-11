import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';
import { applyPropertyChange } from '../src/interaction';

const solidFill = (node: RenderNode): string | undefined =>
  'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;

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

  it('cells touch edge-to-edge with square corners by default', () => {
    const { svg } = render(HEATMAP_SFL);
    const cell = svg.match(/<rect id="[^"]*chart-heatmap-cell-activity-morning-0"[^>]*>/)?.[0];
    expect(cell).toBeDefined();
    expect(cell).not.toContain('rx=');
    const next = svg.match(/<rect id="[^"]*chart-heatmap-cell-activity-morning-1"[^>]*>/)?.[0];
    const [, x, width] = cell?.match(/ x="([\d.]+)"[^>]*width="([\d.]+)"/) ?? [];
    const [, nextX] = next?.match(/ x="([\d.]+)"/) ?? [];
    expect(Number(x) + Number(width)).toBeCloseTo(Number(nextX));
  });

  it('cellGap insets each cell and barCornerRadius rounds it, without touching layout math', () => {
    const gapped = HEATMAP_SFL.replace('type: heatmap', 'type: heatmap\n    cellGap: 4\n    barCornerRadius: 3');
    const { svg: plainSvg } = render(HEATMAP_SFL);
    const { svg: gappedSvg } = render(gapped);
    const plainCell = plainSvg.match(/<rect id="[^"]*chart-heatmap-cell-activity-morning-0"[^>]*>/)?.[0];
    const gappedCell = gappedSvg.match(/<rect id="[^"]*chart-heatmap-cell-activity-morning-0"[^>]*>/)?.[0];
    const plain = plainCell?.match(/ x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    const gapped_ = gappedCell?.match(/ x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    expect(gapped_).toBeDefined();
    expect(gappedCell).toContain('rx="3"');
    expect(Number(gapped_?.[1])).toBeCloseTo(Number(plain?.[1]) + 2);
    expect(Number(gapped_?.[2])).toBeCloseTo(Number(plain?.[2]) + 2);
    expect(Number(gapped_?.[3])).toBeCloseTo(Number(plain?.[3]) - 4);
    expect(Number(gapped_?.[4])).toBeCloseTo(Number(plain?.[4]) - 4);
  });

  it('labels rows from Series.label and columns from config.categories', () => {
    const { svg } = render(HEATMAP_SFL);
    expect(svg).toContain('>Morning<');
    expect(svg).toContain('>Evening<');
    expect(svg).toContain('>Mon<');
    expect(svg).toContain('>Tue<');
    expect(svg).toContain('>Wed<');
  });

  it('draws a single gradient bar spanning every zone color, low to high', () => {
    const { svg } = render(HEATMAP_SFL);
    const bar = svg.match(/<rect id="[^"]*chart-heatmap-legend-bar-activity"[^>]*>/)?.[0];
    expect(bar).toBeDefined();
    expect(bar).toMatch(/fill="url\(#[^"]+\)"/);
    const gradient = svg.match(/<linearGradient[^>]*>[\s\S]*?<\/linearGradient>/)?.[0];
    expect(gradient).toBeDefined();
    const stops = [...(gradient ?? '').matchAll(/stop-color="([^"]+)"/g)].map(match => match[1]);
    expect(stops).toEqual(['#ddd6fe', '#a78bfa', '#6d28d9']);
  });

  it('labels each zone above its own stretch of the bar, and the axis range below it', () => {
    const { svg } = render(HEATMAP_SFL);
    expect(svg).toContain('>Low<');
    expect(svg).toContain('>Medium<');
    expect(svg).toContain('>High<');
    // Axis y runs 0-10 with thresholds [3, 7] : four boundary ticks (0, 3, 7, 10).
    for (const boundary of ['0', '3', '7', '10']) {
      expect(svg).toContain(`>${boundary}<`);
    }
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

  it('exposes one invisible, independently color-editable target per zone over the bar', () => {
    const { svg } = render(HEATMAP_SFL);
    const targets = [...svg.matchAll(/<rect id="[^"]*chart-heatmap-legend-swatch-activity-(\d)"[^>]*>/g)];
    expect(targets).toHaveLength(3);
    targets.forEach((match, index) => {
      expect(match[0]).toContain(`data-sf-prop="zones[${index}][1]"`);
      expect(match[0]).toContain('data-sf-prop-kind="color"');
      // transparent, not "none" - a `none` fill isn't hit-tested by SVG, so
      // clicking the bar wouldn't reach a target at all.
      expect(match[0]).toContain('fill="transparent"');
    });
  });

  it('round-trips a click-to-recolor edit through the source and back into the render', () => {
    const patched = applyPropertyChange(HEATMAP_SFL, {
      owner: { role: 'chart', id: 'activity' },
      path: 'zones[1][1]',
      value: '#ff00ff',
    });
    expect(patched).toContain('["Medium", "#ff00ff"]');
    // Every other zone's own color is untouched by the edit.
    expect(patched).toContain('["Low", "#ddd6fe"]');
    expect(patched).toContain('["High", "#6d28d9"]');

    const { diagnostics, svg } = render(patched);
    expect(diagnostics).toEqual([]);
    // Morning's own values are [1, 5, 9] : 5 sits in the [3, 7) "Medium"
    // band, so that one cell should pick up the new color - the recolor
    // reaches the cells themselves, not just the legend's own gradient.
    const morning = svg.match(/chart-heatmap-cell-activity-morning-1"[^>]* fill="([^"]+)"/)?.[1];
    expect(morning).toBe('#ff00ff');
    const stops = [
      ...(svg.match(/<linearGradient[^>]*>[\s\S]*?<\/linearGradient>/)?.[0] ?? '').matchAll(/stop-color="([^"]+)"/g),
    ].map(match => match[1]);
    expect(stops).toEqual(['#ddd6fe', '#ff00ff', '#6d28d9']);
  });
});
