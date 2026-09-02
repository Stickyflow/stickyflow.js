import type { ChartZone } from '../../../model/charts';
import { chartText, DEFAULT_ZONE_FILL } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

export function renderHeatmapLegend(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.legendHeight <= 0) {
    return [];
  }

  const nodes: RenderNode[] = [];
  const itemWidths = layout.zones.map(zone => legendItemWidth(zone, layout.fontSize));
  let x = layout.grid.x;
  layout.zones.forEach((zone, zoneIndex) => {
    nodes.push(...createLegendItem(context, layout, zone, zoneIndex, x, itemWidths[zoneIndex]));
    x += itemWidths[zoneIndex];
  });
  return nodes;
}

function legendItemWidth(zone: ChartZone, fontSize: number): number {
  return Math.max(64, (zone.label?.length ?? 0) * (fontSize - 1) * 0.55 + 40);
}

function createLegendItem(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  zone: ChartZone,
  zoneIndex: number,
  x: number,
  width: number,
): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const lowerBound = layout.bands[zoneIndex];
  const upperBound = layout.bands[zoneIndex + 1];
  const y = layout.grid.y + layout.grid.height + 6;
  return [
    {
      type: 'rect',
      id: `chart-heatmap-legend-swatch-${chart.id}-${zoneIndex}`,
      order: nextOrder(),
      bounds,
      x,
      y: y + 2,
      width: 10,
      height: 10,
      rx: 2,
      style: { fill: { kind: 'solid', color: zone.color ?? DEFAULT_ZONE_FILL } },
    },
    chartText({
      id: `chart-heatmap-legend-${chart.id}-${zoneIndex}`,
      order: nextOrder(),
      bounds,
      frame: { x: x + 15, y, width: width - 15, height: layout.fontSize },
      text: zone.label ? `${zone.label} (${lowerBound}-${upperBound})` : `${lowerBound}-${upperBound}`,
      chart,
    }),
  ];
}
