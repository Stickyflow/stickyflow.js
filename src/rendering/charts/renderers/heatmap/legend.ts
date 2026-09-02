import type { ChartZone } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

interface HeatmapLegendItem {
  zone: ChartZone;
  zoneIndex: number;
  lowerBound: number;
  upperBound: number;
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

function legendItemWidth(zone: ChartZone, fontSize: number): number {
  return Math.max(64, (zone.label?.length ?? 0) * (fontSize - 1) * 0.55 + 40);
}

function createHeatmapLegendItems(layout: HeatmapLayout): HeatmapLegendItem[] {
  const items: HeatmapLegendItem[] = [];
  let x = layout.grid.x;
  layout.zones.forEach((zone, zoneIndex) => {
    const width = legendItemWidth(zone, layout.fontSize);
    items.push({
      zone,
      zoneIndex,
      lowerBound: layout.bands[zoneIndex],
      upperBound: layout.bands[zoneIndex + 1],
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
    width: 10,
    height: 10,
    rx: 2,
    style: { fill: { kind: 'solid', color: item.zone.color ?? DEFAULT_ZONE_FILL } },
  };
}

function createLegendLabel(context: ChartRenderContext, item: HeatmapLegendItem): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const range = `${item.lowerBound}-${item.upperBound}`;
  return chartText({
    id: `chart-heatmap-legend-${chart.id}-${item.zoneIndex}`,
    order: nextOrder(),
    bounds,
    frame: { x: item.x + 15, y: item.y, width: item.width - 15, height: item.labelHeight },
    text: item.zone.label ? `${item.zone.label} (${range})` : range,
    chart,
  });
}
