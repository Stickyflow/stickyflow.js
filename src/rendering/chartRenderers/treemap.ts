import { squarifyTreemap } from '../../model/geometry/treemap';
import { wrapText } from '../../model/geometry/text';
import { finite, paint } from '../renderPrimitives';
import { axisBands, bandIndexForValue, chartText, contrastTextColor, DEFAULT_HEATMAP_ZONES, DEFAULT_ZONE_FILL, representativeColor } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderTreemap(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const leaves = chart.series;
  const bandsArr = axisBands(chart.axis_y);
  const zones = chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES;
  const treemapFontSize = Math.max(9, finite(chart.font_size, 12));
  const smallFontSize = Math.max(8, treemapFontSize - 1);
  const leafValue = (leaf: typeof leaves[number]) => (leaf.values as number[])[0] ?? 0;
  const leafColor = (leaf: typeof leaves[number]) => leaf.color ?? zones[bandIndexForValue(leafValue(leaf), bandsArr)]?.color ?? DEFAULT_ZONE_FILL;
  const legendHeight = showLegend ? 28 : 0;
  const gridWidth = Math.max(1, plot.width), gridHeight = Math.max(1, plot.height - legendHeight);
  const leafItems = leaves.map(leaf => ({ leaf, value: leafValue(leaf) }));
  
  for (const tile of squarifyTreemap(leafItems, 0, 0, gridWidth, gridHeight)) {
    const { leaf, value } = tile.item;
    const x = plot.x + tile.x, y = plot.y + tile.y;
    const color = leafColor(leaf);
    nodes.push({ type: 'rect', id: `chart-treemap-tile-${chart.id}-${leaf.id}`, order: nextOrder(), bounds, x, y, width: tile.width, height: tile.height, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'solid', color: '#ffffff' }, strokeWidth: 1 } });
    if (showLabels && tile.width >= 34 && tile.height >= 18) {
      nodes.push({
        ...chartText(`chart-treemap-label-${chart.id}-${leaf.id}`, nextOrder(), bounds, x + 4, y + 3, Math.max(1, tile.width - 8), Math.max(1, tile.height - 6), `${leaf.label} ${value}`, chart),
        lines: wrapText(`${leaf.label}\n${value}`, Math.max(1, tile.width - 8), smallFontSize), fontSize: smallFontSize, color: contrastTextColor(representativeColor(color, '#ffffff')),
      });
    }
  }
  if (legendHeight > 0) {
    const legendItemWidths = zones.map(zone => Math.max(64, (zone.label?.length ?? 0) * (treemapFontSize - 1) * .55 + 40));
    let legendX = plot.x;
    const legendY = plot.y + gridHeight + 6;
    zones.forEach((zone, i) => {
      const [lo, hi] = [bandsArr[i], bandsArr[i + 1]];
      nodes.push({ type: 'rect', id: `chart-treemap-legend-swatch-${chart.id}-${i}`, order: nextOrder(), bounds, x: legendX, y: legendY + 2, width: 10, height: 10, rx: 2, style: { fill: { kind: 'solid', color: zone.color ?? DEFAULT_ZONE_FILL } } });
      nodes.push(chartText(`chart-treemap-legend-${chart.id}-${i}`, nextOrder(), bounds, legendX + 15, legendY, legendItemWidths[i] - 15, treemapFontSize, zone.label ? `${zone.label} (${lo}-${hi})` : `${lo}-${hi}`, chart));
      legendX += legendItemWidths[i];
    });
  }
  return nodes;
}

