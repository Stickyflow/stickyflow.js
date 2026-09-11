import type { ChartZone } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { TreemapLayout } from './types';

interface TreemapLegendItem {
  zone: ChartZone;
  zoneIndex: number;
  lowerBound: number;
  upperBound: number;
  x: number;
  y: number;
  width: number;
  labelHeight: number;
}

interface TreemapLegendOrigin {
  x: number;
  y: number;
}

export function renderTreemapLegend(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  if (layout.legendHeight <= 0) {
    return [];
  }

  const origin = { x: context.plot.x, y: context.plot.y + layout.gridHeight + 6 };
  return createTreemapLegendItems(layout, origin).flatMap(item => renderTreemapLegendItem(context, item));
}

function legendItemWidth(zone: ChartZone, fontSize: number): number {
  return Math.max(64, (zone.label?.length ?? 0) * (fontSize - 1) * 0.55 + 40);
}

function createTreemapLegendItems(layout: TreemapLayout, origin: TreemapLegendOrigin): TreemapLegendItem[] {
  const items: TreemapLegendItem[] = [];
  let x = origin.x;
  // layout.zones always has entries (falls back to the 3-zone default) even
  // when axis_y has no thresholds and so only one real band exists - only
  // render as many legend items as there are actual bands, or the extra
  // zones show a bogus "undefined-undefined" range past the last boundary.
  const bandCount = Math.max(0, layout.bands.length - 1);
  layout.zones.slice(0, bandCount).forEach((zone, zoneIndex) => {
    const width = legendItemWidth(zone, layout.fontSize);
    items.push({
      zone,
      zoneIndex,
      lowerBound: layout.bands[zoneIndex],
      upperBound: layout.bands[zoneIndex + 1],
      x,
      y: origin.y,
      width,
      labelHeight: layout.fontSize,
    });
    x += width;
  });
  return items;
}

function renderTreemapLegendItem(context: ChartRenderContext, item: TreemapLegendItem): RenderNode[] {
  return [createLegendSwatch(context, item), createLegendLabel(context, item)];
}

function createLegendSwatch(context: ChartRenderContext, item: TreemapLegendItem): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-treemap-legend-swatch-${chart.id}-${item.zoneIndex}`,
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

function createLegendLabel(context: ChartRenderContext, item: TreemapLegendItem): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const range = `${item.lowerBound}-${item.upperBound}`;
  return chartText({
    id: `chart-treemap-legend-${chart.id}-${item.zoneIndex}`,
    order: nextOrder(),
    bounds,
    frame: { x: item.x + 15, y: item.y, width: item.width - 15, height: item.labelHeight },
    text: item.zone.label ? `${item.zone.label} (${range})` : range,
    chart,
  });
}
