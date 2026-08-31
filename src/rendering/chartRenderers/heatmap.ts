import { finite } from '../renderPrimitives';
import { axisBands, bandIndexForValue, chartText, contrastTextColor, DEFAULT_HEATMAP_ZONES, DEFAULT_ZONE_FILL } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderHeatmap(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const rows = chart.series;
  const columns = chart.config?.categories?.length ? chart.config.categories : ((rows[0]?.values as number[] | undefined)?.map((_, i) => String(i + 1)) ?? []);
  const bandsArr = axisBands(chart.axis_y);
  const zones = chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES;
  const heatmapFontSize = Math.max(9, finite(chart.font_size, 12));
  const rowHeaderWidth = showLabels ? Math.min(96, Math.max(0, plot.width * .3)) : 0;
  const colHeaderHeight = showLabels ? 24 : 0;
  const legendHeight = showLegend ? 22 : 0;
  const gridX = plot.x + rowHeaderWidth, gridY = plot.y + colHeaderHeight;
  const gridWidth = Math.max(1, plot.width - rowHeaderWidth);
  const gridHeight = Math.max(1, plot.height - colHeaderHeight - legendHeight);
  const cellW = columns.length ? gridWidth / columns.length : gridWidth;
  const cellH = rows.length ? gridHeight / rows.length : gridHeight;
  
  rows.forEach((series, rowIndex) => {
    const values = series.values as number[];
    const y = gridY + rowIndex * cellH;
    columns.forEach((_, colIndex) => {
      const value = values[colIndex] ?? 0;
      const color = zones[bandIndexForValue(value, bandsArr)]?.color ?? DEFAULT_ZONE_FILL;
      const x = gridX + colIndex * cellW;
      nodes.push({ type: 'rect', id: `chart-heatmap-cell-${chart.id}-${series.id}-${colIndex}`, order: nextOrder(), bounds, x, y, width: cellW, height: cellH, style: { fill: { kind: 'solid', color }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
      nodes.push({ ...chartText(`chart-heatmap-value-${chart.id}-${series.id}-${colIndex}`, nextOrder(), bounds, x, y + cellH / 2 - heatmapFontSize / 2, cellW, heatmapFontSize + 2, String(value), chart, 'center'), color: contrastTextColor(color) });
    });
  });
  if (rowHeaderWidth > 0) rows.forEach((series, rowIndex) => {
    nodes.push(chartText(`chart-heatmap-row-${chart.id}-${series.id}`, nextOrder(), bounds, plot.x, gridY + rowIndex * cellH + cellH / 2 - heatmapFontSize / 2, rowHeaderWidth - 8, heatmapFontSize + 2, series.label, chart));
  });
  if (colHeaderHeight > 0) columns.forEach((label, colIndex) => {
    nodes.push(chartText(`chart-heatmap-col-${chart.id}-${colIndex}`, nextOrder(), bounds, gridX + colIndex * cellW, plot.y, cellW, heatmapFontSize + 2, label, chart, 'center'));
  });
  if (legendHeight > 0) {
    const legendItemWidths = zones.map(zone => Math.max(64, (zone.label?.length ?? 0) * (heatmapFontSize - 1) * .55 + 40));
    let legendX = gridX;
    const legendY = gridY + gridHeight + 6;
    zones.forEach((zone, i) => {
      const [lo, hi] = [bandsArr[i], bandsArr[i + 1]];
      const swatchColor = zone.color ?? DEFAULT_ZONE_FILL;
      nodes.push({ type: 'rect', id: `chart-heatmap-legend-swatch-${chart.id}-${i}`, order: nextOrder(), bounds, x: legendX, y: legendY + 2, width: 10, height: 10, rx: 2, style: { fill: { kind: 'solid', color: swatchColor } } });
      nodes.push(chartText(`chart-heatmap-legend-${chart.id}-${i}`, nextOrder(), bounds, legendX + 15, legendY, legendItemWidths[i] - 15, heatmapFontSize, zone.label ? `${zone.label} (${lo}-${hi})` : `${lo}-${hi}`, chart));
      legendX += legendItemWidths[i];
    });
  }
  return nodes;
}

