import { describe, expect, it } from 'vitest';
import { render, renderCanvas, sflToCanvasState, sflToRenderInput } from '../src/index';

// Fields §3.4 - mirrors stickyflow-atlas's field chart_type (continuous
// scale, IDW interpolation, isolines, vector-field arrows) on this package's
// own render pipeline.

const FIELD_SFL = `sfl 1.2

Model board {
  Chart wlan {
    text: "WLAN signal"
    type: field
    scale: "ramp(#0b1d51 0, #22d3ee 0.5, #f5d90a 1)"
    interpolate: idw
    idwPower: 2
    isolines: [0.5]
    Axis x {
      min: 0
      max: 10
      step: 2
    }
    Axis y {
      min: 0
      max: 10
      step: 2
    }
    Series messung {
      values: [[0, 0, 0], [10, 10, 1], [0, 10, 0.5]]
    }
    Series wind {
      color: "#0f172a"
      values: [[5, 5, 0, 2]]
    }
    layout {
      position: 0, 0
      size: 400, 300
    }
  }
}`;

describe('Chart type field (SFL 1.4, §3.4)', () => {
  it('parses scale/interpolate/idwPower/isolines and scalar+vector series generically', () => {
    const state = sflToCanvasState(FIELD_SFL);
    const chart = state.entities[0].chart;
    expect(chart?.chartType).toBe('field');
    expect(chart?.scale).toBe('ramp(#0b1d51 0, #22d3ee 0.5, #f5d90a 1)');
    expect(chart?.interpolate).toBe('idw');
    expect(chart?.idwPower).toBe(2);
    expect(chart?.isolines).toEqual([0.5]);
    expect(chart?.series.find(s => s.id === 'messung')?.values).toEqual([
      [0, 0, 0],
      [10, 10, 1],
      [0, 10, 0.5],
    ]);
    expect(chart?.series.find(s => s.id === 'wind')?.values).toEqual([[5, 5, 0, 2]]);
  });

  it('decodes scale into a ChartRamp object on the render-input config', () => {
    const input = sflToRenderInput(FIELD_SFL);
    expect(input.charts?.[0].config?.scale).toEqual({
      type: 'ramp',
      stops: [
        { color: '#0b1d51', position: 0 },
        { color: '#22d3ee', position: 0.5 },
        { color: '#f5d90a', position: 1 },
      ],
    });
    expect(input.charts?.[0].config?.interpolate).toBe('idw');
    expect(input.charts?.[0].config?.idwPower).toBe(2);
    expect(input.charts?.[0].config?.isolines).toEqual([0.5]);
  });

  it('renders the interpolated surface as colored cells, an isoline path, and a vector arrow', () => {
    const { scene } = renderCanvas(sflToRenderInput(FIELD_SFL));
    const cells = scene.nodes.filter(node => node.id.startsWith('chart-field-cell-wlan-'));
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every(node => node.type === 'rect')).toBe(true);

    const isoline = scene.nodes.find(node => node.id === 'chart-field-isoline-wlan-0');
    expect(isoline?.type === 'path' && isoline.d.startsWith('M ')).toBe(true);

    const vector = scene.nodes.find(node => node.id === 'chart-field-vector-wlan-wind-0');
    expect(vector?.type === 'path' && vector.markerEnd).toBe('filled_arrow');
  });

  it('exports the vector arrow with a filled_arrow SVG marker', () => {
    const { svg } = render(FIELD_SFL);
    expect(svg).toContain('sf-chart-field-vector-wlan-wind-0');
    expect(svg).toContain('marker-end="url(#sf-marker-filled_arrow');
  });

  it('emits no surface cells or isolines when only a vector series is present', () => {
    const vectorOnly = FIELD_SFL.replace(/Series messung \{[\s\S]*?\}\n {4}/, '');
    const { scene } = renderCanvas(sflToRenderInput(vectorOnly));
    expect(scene.nodes.some(node => node.id.startsWith('chart-field-cell-'))).toBe(false);
    expect(scene.nodes.some(node => node.id.startsWith('chart-field-isoline-'))).toBe(false);
    expect(scene.nodes.some(node => node.id.startsWith('chart-field-vector-'))).toBe(true);
  });

  it("renders a colorbar legend with min/max labels from the ramp's own stop range, not the axis range", () => {
    const { scene } = renderCanvas(sflToRenderInput(FIELD_SFL));
    const bar = scene.nodes.find(node => node.id === 'chart-field-colorbar-wlan');
    expect(bar?.type === 'rect' && bar.style.fill?.kind).toBe('linear-gradient');
    const min = scene.nodes.find(node => node.id === 'chart-field-colorbar-min-wlan');
    const max = scene.nodes.find(node => node.id === 'chart-field-colorbar-max-wlan');
    expect(min?.type === 'text' && min.lines).toEqual(['0']);
    expect(max?.type === 'text' && max.lines).toEqual(['1']);
  });

  it('caps the interpolated grid well below one cell per pixel, so a 400x300 chart stays under a thousand SVG rects', () => {
    const { svg } = render(FIELD_SFL);
    const cellCount = (svg.match(/chart-field-cell-/g) ?? []).length;
    expect(cellCount).toBe(544);
    expect(cellCount).toBeLessThan(1000);
  });

  it('omits the colorbar (but keeps the surface) when the legend is off', () => {
    const noLegend = FIELD_SFL.replace('text: "WLAN signal"', 'text: "WLAN signal"\n    style { showLegend: false }');
    const { scene } = renderCanvas(sflToRenderInput(noLegend));
    expect(scene.nodes.some(node => node.id.startsWith('chart-field-colorbar-'))).toBe(false);
    expect(scene.nodes.some(node => node.id.startsWith('chart-field-cell-'))).toBe(true);
  });

  it('clips the surface cells and the grid lines to the same single rounded rect matching cornerRadius, not one clipPath per node', () => {
    const rounded = FIELD_SFL.replace('type: field', 'type: field\n    style { cornerRadius: 20 }');
    const { scene } = renderCanvas(sflToRenderInput(rounded));
    const cells = scene.nodes.filter(node => node.id.startsWith('chart-field-cell-'));
    const gridLines = scene.nodes.filter(node => node.id.startsWith('chart-grid-'));
    const isolines = scene.nodes.filter(node => node.id.startsWith('chart-field-isoline-'));
    expect(cells.length).toBeGreaterThan(0);
    expect(gridLines.length).toBeGreaterThan(0);
    expect(isolines.length).toBeGreaterThan(0);
    expect(cells.every(node => node.type === 'rect' && node.style.clip?.rx === 20)).toBe(true);
    expect(gridLines.every(node => node.type === 'path' && node.style.clip?.rx === 20)).toBe(true);
    expect(isolines.every(node => node.type === 'path' && node.style.clip?.rx === 20)).toBe(true);

    const { svg } = render(rounded);
    expect((svg.match(/<clipPath/g) ?? []).length).toBe(1);
    expect((svg.match(/clip-path="url\(#/g) ?? []).length).toBe(cells.length + gridLines.length + isolines.length);
  });

  it('keeps the legend clear of the frame edge: colorbar + labels fit inside the reserved bottom padding', () => {
    const { scene } = renderCanvas(sflToRenderInput(FIELD_SFL));
    const chart = scene.nodes.find(node => node.id === 'chart-wlan');
    const minLabel = scene.nodes.find(node => node.id === 'chart-field-colorbar-min-wlan');
    if (chart?.type !== 'rect' || minLabel?.type !== 'text') {
      throw new Error('expected chart frame rect and colorbar min label');
    }
    const frameBottom = chart.y + chart.height;
    const labelBottom = minLabel.y + minLabel.height;
    expect(labelBottom).toBeLessThan(frameBottom);
  });
});
