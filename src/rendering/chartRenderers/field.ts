import { colorAtRamp, computeFieldGrid, type FieldSample } from '../field';
import { computeIsolineSegments } from '../isolines';
import { paint } from '../renderPrimitives';
import { chartText, CHART_COLORS, formatFieldValue, mapChartValue } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderField(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const power = chart.config?.idwPower ?? 2;
  const scalarSamples: FieldSample[] = chart.series
    .filter(series => (series.values[0] as number[] | undefined)?.length === 3)
    .flatMap(series => (series.values as [number, number, number][]).map(([vx, vy, value]) => ({
      x: mapChartValue(vx, chart.axis_x, plot.width),
      y: plot.height - mapChartValue(vy, chart.axis_y, plot.height),
      value,
    })));
  const vectorSeriesList = chart.series.filter(series => (series.values[0] as number[] | undefined)?.length === 4);
  
  if (scalarSamples.length && plot.width > 0 && plot.height > 0) {
    const { grid, cols, rows } = computeFieldGrid(scalarSamples, plot.width, plot.height, power);
    const cellW = plot.width / Math.max(1, cols - 1), cellH = plot.height / Math.max(1, rows - 1);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = plot.x + plot.width * (col / (cols - 1));
        const cy = plot.y + plot.height * (row / (rows - 1));
        const color = colorAtRamp(chart.config?.scale, grid[row * cols + col]);
        nodes.push({
          type: 'rect', id: `chart-field-cell-${chart.id}-${row}-${col}`, order: nextOrder(), bounds,
          x: cx - cellW / 2, y: cy - cellH / 2, width: cellW, height: cellH,
          style: { fill: { kind: 'solid', color } },
        });
      }
    }
    (chart.config?.isolines ?? []).forEach((threshold, ti) => {
      const segments = computeIsolineSegments(grid, cols, rows, plot.width, plot.height, threshold);
      if (!segments.length) return;
      const d = segments.map(seg => `M ${plot.x + seg.x1} ${plot.y + seg.y1} L ${plot.x + seg.x2} ${plot.y + seg.y2}`).join(' ');
      nodes.push({
        type: 'path', id: `chart-field-isoline-${chart.id}-${ti}`, order: nextOrder(), bounds, d,
        style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: 'rgba(15, 23, 42, 0.55)' }, strokeWidth: 1 },
      });
    });
  }
  
  vectorSeriesList.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    (series.values as [number, number, number, number][]).forEach(([vx, vy, angle, magnitude], i) => {
      const startX = plot.x + mapChartValue(vx, chart.axis_x, plot.width);
      const startY = plot.y + plot.height - mapChartValue(vy, chart.axis_y, plot.height);
      const endX = plot.x + mapChartValue(vx + Math.cos(angle) * magnitude, chart.axis_x, plot.width);
      const endY = plot.y + plot.height - mapChartValue(vy + Math.sin(angle) * magnitude, chart.axis_y, plot.height);
      nodes.push({
        type: 'path', id: `chart-field-vector-${chart.id}-${series.id}-${i}`, order: nextOrder(), bounds,
        d: `M ${startX} ${startY} L ${endX} ${endY}`, markerEnd: 'filled_arrow',
        style: { fill: { kind: 'none' }, stroke: paint(color, diagnostics, chart.id), strokeWidth: 2 },
      });
    });
  });
  if (showLegend && chart.config?.scale?.stops.length) {
    const rampStops = [...chart.config.scale.stops].sort((a, b) => a.position - b.position);
    const min = rampStops[0].position, max = rampStops[rampStops.length - 1].position, span = max - min;
    const barWidth = Math.min(220, plot.width), barX = plot.x + (plot.width - barWidth) / 2, barY = plot.y + plot.height + 46, barHeight = 8;
    nodes.push({
      type: 'rect', id: `chart-field-colorbar-${chart.id}`, order: nextOrder(), bounds,
      x: barX, y: barY, width: barWidth, height: barHeight, rx: 2,
      style: { fill: { kind: 'linear-gradient', angle: 0, stops: rampStops.map(s => ({ offset: span === 0 ? 0 : (s.position - min) / span * 100, color: s.color })) } },
    });
    nodes.push(chartText(`chart-field-colorbar-min-${chart.id}`, nextOrder(), bounds, barX, barY + barHeight + 3, 80, 16, formatFieldValue(min), chart));
    nodes.push(chartText(`chart-field-colorbar-max-${chart.id}`, nextOrder(), bounds, barX + barWidth - 80, barY + barHeight + 3, 80, 16, formatFieldValue(max), chart, 'right'));
  }
  return nodes;
}

