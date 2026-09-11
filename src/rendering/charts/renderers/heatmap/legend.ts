import type { ChartZone } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

const SWATCH_SIZE = 10;
const SWATCH_GAP = 5;
const ITEM_GAP = 14;

interface HeatmapLegendItem {
  zone: ChartZone;
  zoneIndex: number;
  labelText: string;
  x: number;
  y: number;
  width: number;
  labelHeight: number;
}

export function renderHeatmapLegend(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.reservedSpace.legend <= 0) {
    return [];
  }

  return createHeatmapLegendItems(layout).flatMap(item => renderHeatmapLegendItem(context, item));
}

function legendLabelText(zone: ChartZone, lowerBound: number, upperBound: number): string {
  const range = `${lowerBound}-${upperBound}`;
  return zone.label ? `${zone.label} (${range})` : range;
}

// Measured against the whole rendered string, "Medium (3-7)" and all, not
// just zone.label - sizing from the label alone left every range suffix
// spilling into the next swatch.
function legendLabelWidth(labelText: string, fontSize: number): number {
  return labelText.length * (fontSize - 1) * 0.58;
}

function createHeatmapLegendItems(layout: HeatmapLayout): HeatmapLegendItem[] {
  const rawWidths = layout.zones.map(
    (zone, zoneIndex) =>
      SWATCH_SIZE +
      SWATCH_GAP +
      legendLabelWidth(legendLabelText(zone, layout.bands[zoneIndex], layout.bands[zoneIndex + 1]), layout.fontSize) +
      ITEM_GAP,
  );
  const total = rawWidths.reduce((sum, width) => sum + width, 0);
  // Shrink to fit the grid width rather than run off the right edge.
  const scale = total > layout.grid.width && total > 0 ? layout.grid.width / total : 1;

  const items: HeatmapLegendItem[] = [];
  let x = layout.grid.x;
  layout.zones.forEach((zone, zoneIndex) => {
    const width = rawWidths[zoneIndex] * scale;
    items.push({
      zone,
      zoneIndex,
      labelText: legendLabelText(zone, layout.bands[zoneIndex], layout.bands[zoneIndex + 1]),
      x,
      y: layout.grid.y + layout.grid.height + 6,
      width,
      labelHeight: layout.fontSize,
    });
    x += width;
  });
  return items;
}

function renderHeatmapLegendItem(context: ChartRenderContext, item: HeatmapLegendItem): RenderNode[] {
  return [createLegendSwatch(context, item), createLegendLabel(context, item)];
}

function createLegendSwatch(context: ChartRenderContext, item: HeatmapLegendItem): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-heatmap-legend-swatch-${chart.id}-${item.zoneIndex}`,
    order: nextOrder(),
    bounds,
    x: item.x,
    y: item.y + 2,
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    rx: 2,
    style: { fill: { kind: 'solid', color: item.zone.color ?? DEFAULT_ZONE_FILL } },
  };
}

function createLegendLabel(context: ChartRenderContext, item: HeatmapLegendItem): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const labelX = item.x + SWATCH_SIZE + SWATCH_GAP;
  return chartText({
    id: `chart-heatmap-legend-${chart.id}-${item.zoneIndex}`,
    order: nextOrder(),
    bounds,
    frame: { x: labelX, y: item.y, width: Math.max(1, item.x + item.width - labelX), height: item.labelHeight },
    text: item.labelText,
    chart,
  });
}
