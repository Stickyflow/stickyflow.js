import type { RenderNode } from '../../../scene';
import { boxBounds } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL, formatFieldValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { TreemapLayout } from './types';

const BAR_HEIGHT = 10;
const TICK_HEIGHT = 4;
const ROW_GAP = 2;

export function renderTreemapLegend(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  if (layout.legendHeight <= 0 || layout.zones.length === 0) {
    return [];
  }

  const barX = context.plot.x;
  const barWidth = layout.gridWidth;
  const labelHeight = layout.fontSize + 2;
  const barY = context.plot.y + layout.gridHeight + 6;
  const barBounds = boxBounds({ x: barX, y: barY, width: barWidth, height: BAR_HEIGHT });

  return [
    createGradientBar(context, layout, barX, barY, barWidth, barBounds),
    ...createZoneColorTargets(context, layout, barX, barY, barWidth, barBounds),
    ...createBoundaryTicks(context, layout, barX, barY, barWidth, labelHeight),
  ];
}

function createZoneColorTargets(
  context: ChartRenderContext,
  layout: TreemapLayout,
  barX: number,
  barY: number,
  barWidth: number,
  barBounds: RenderNode['bounds'],
): RenderNode[] {
  const { chart, nextOrder } = context;
  return layout.zones.flatMap((_zone, index) => {
    const start = layout.bands[index];
    const end = layout.bands[index + 1];
    if (start === undefined || end === undefined) {
      return [];
    }
    const x = barX + bandRatio(layout, start) * barWidth;
    const width = Math.max(1, (bandRatio(layout, end) - bandRatio(layout, start)) * barWidth);
    return [
      {
        type: 'rect' as const,
        id: `chart-treemap-legend-swatch-${chart.id}-${index}`,
        order: nextOrder(),
        bounds: barBounds,
        x,
        y: barY,
        width,
        height: BAR_HEIGHT,
        prop: `zones[${index}][1]`,
        propKind: 'color' as const,
        propSolidOnly: true,
        style: { fill: { kind: 'solid' as const, color: 'transparent' } },
      },
    ];
  });
}

function bandRatio(layout: TreemapLayout, value: number): number {
  const first = layout.bands[0];
  const last = layout.bands[layout.bands.length - 1];
  return last === first ? 0 : (value - first) / (last - first);
}

function createGradientBar(
  context: ChartRenderContext,
  layout: TreemapLayout,
  barX: number,
  barY: number,
  barWidth: number,
  barBounds: RenderNode['bounds'],
): RenderNode {
  const { chart, nextOrder } = context;
  const bandCount = Math.max(0, layout.bands.length - 1);
  const zones = layout.zones.slice(0, bandCount);
  const stops = zones.map((zone, index) => ({
    offset: bandRatio(layout, layout.bands[index + 1] ?? layout.bands[layout.bands.length - 1]) * 100,
    color: zone.color ?? DEFAULT_ZONE_FILL,
  }));
  return {
    type: 'rect',
    id: `chart-treemap-legend-bar-${chart.id}`,
    order: nextOrder(),
    bounds: barBounds,
    x: barX,
    y: barY,
    width: barWidth,
    height: BAR_HEIGHT,
    rx: 3,
    style: {
      fill: stops.length ? { kind: 'linear-gradient', angle: 0, stops } : { kind: 'solid', color: DEFAULT_ZONE_FILL },
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: 1,
    },
  };
}

function createBoundaryTicks(
  context: ChartRenderContext,
  layout: TreemapLayout,
  barX: number,
  barY: number,
  barWidth: number,
  labelHeight: number,
): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const labelY = barY + BAR_HEIGHT + TICK_HEIGHT + ROW_GAP;
  const labelWidth = 48;

  return layout.bands.flatMap((value, index) => {
    const x = barX + bandRatio(layout, value) * barWidth;
    const tick: RenderNode = {
      type: 'path',
      id: `chart-treemap-legend-tick-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      d: `M ${x} ${barY + BAR_HEIGHT} L ${x} ${barY + BAR_HEIGHT + TICK_HEIGHT}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
        strokeWidth: 1,
      },
    };
    const isFirst = index === 0;
    const isLast = index === layout.bands.length - 1;
    const align = isFirst ? 'left' : isLast ? 'right' : 'center';
    const frameX = isFirst ? x : isLast ? x - labelWidth : x - labelWidth / 2;
    const label = chartText({
      id: `chart-treemap-legend-tick-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      frame: { x: frameX, y: labelY, width: labelWidth, height: labelHeight },
      text: formatFieldValue(value),
      chart,
      align,
    });
    return [tick, label];
  });
}
