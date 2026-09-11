import type { RenderNode } from '../../../scene';
import { boxBounds } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL, formatFieldValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

const BAR_HEIGHT = 10;
const TICK_HEIGHT = 4;
const ROW_GAP = 2;

// One continuous gradient bar rather than a discrete swatch per zone : cells
// are still colored by a hard band lookup (bandIndexForValue), but the
// *legend* reads better as a smooth low -> high ramp — that is what actually
// shows a reader which end of the scale is which, and a tick under every
// band boundary spells out exactly where the values run from and to, which
// a row of disconnected boxes never communicated. zone.label (if given)
// still renders, as a caption above the segment of the bar its own band
// covers, so it isn't lost — just no longer crowding the numbers below.
export function renderHeatmapLegend(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.reservedSpace.legend <= 0 || layout.zones.length === 0) {
    return [];
  }

  const barX = layout.grid.x;
  const barWidth = layout.grid.width;
  const labelHeight = layout.fontSize + 2;
  const barY = layout.grid.y + layout.grid.height + 6 + labelHeight + ROW_GAP;
  const barBounds = boxBounds({ x: barX, y: barY, width: barWidth, height: BAR_HEIGHT });

  return [
    ...createZoneLabels(context, layout, barX, barY, barWidth, labelHeight),
    createGradientBar(context, layout, barX, barY, barWidth, barBounds),
    ...createZoneColorTargets(context, layout, barX, barY, barWidth, barBounds),
    ...createBoundaryTicks(context, layout, barX, barY, barWidth, labelHeight),
  ];
}

// One invisible hit target per zone, stacked on top of the gradient bar (a
// later `order` paints on top) over exactly the stretch of bar that zone's
// band covers. fill: transparent rather than `none` — SVG only hit-tests a
// "painted" shape, and a `none` fill isn't one, but a transparent solid
// color still is. Lets a reader click any segment of the bar to open a
// color picker for that one zone (zones[index][1] — index 0 of the pair is
// the zone's label, left alone), without touching how the bar itself looks.
function createZoneColorTargets(
  context: ChartRenderContext,
  layout: HeatmapLayout,
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
        id: `chart-heatmap-legend-swatch-${chart.id}-${index}`,
        order: nextOrder(),
        bounds: barBounds,
        x,
        y: barY,
        width,
        height: BAR_HEIGHT,
        prop: `zones[${index}][1]`,
        propKind: 'color' as const,
        style: { fill: { kind: 'solid' as const, color: 'transparent' } },
      },
    ];
  });
}

function bandRatio(layout: HeatmapLayout, value: number): number {
  const first = layout.bands[0];
  const last = layout.bands[layout.bands.length - 1];
  return last === first ? 0 : (value - first) / (last - first);
}

function createGradientBar(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  barX: number,
  barY: number,
  barWidth: number,
  barBounds: RenderNode['bounds'],
): RenderNode {
  const { chart, nextOrder } = context;
  const stops = layout.zones.map((zone, index) => ({
    offset: layout.zones.length === 1 ? 0 : (index / (layout.zones.length - 1)) * 100,
    color: zone.color ?? DEFAULT_ZONE_FILL,
  }));
  return {
    type: 'rect',
    id: `chart-heatmap-legend-bar-${chart.id}`,
    order: nextOrder(),
    bounds: barBounds,
    x: barX,
    y: barY,
    width: barWidth,
    height: BAR_HEIGHT,
    rx: 3,
    style: {
      fill: { kind: 'linear-gradient', angle: 0, stops },
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: 1,
    },
  };
}

// A tick at every band boundary (axis min, each threshold, axis max), each
// labelled with its actual value underneath — the "from where to where".
function createBoundaryTicks(
  context: ChartRenderContext,
  layout: HeatmapLayout,
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
      id: `chart-heatmap-legend-tick-${chart.id}-${index}`,
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
      id: `chart-heatmap-legend-tick-label-${chart.id}-${index}`,
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

function createZoneLabels(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  barX: number,
  barY: number,
  barWidth: number,
  labelHeight: number,
): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const labelY = barY - ROW_GAP - labelHeight;
  return layout.zones.flatMap((zone, index) => {
    const start = layout.bands[index];
    const end = layout.bands[index + 1];
    if (!zone.label || start === undefined || end === undefined) {
      return [];
    }
    const centerX = barX + ((bandRatio(layout, start) + bandRatio(layout, end)) / 2) * barWidth;
    const width = Math.max(1, (bandRatio(layout, end) - bandRatio(layout, start)) * barWidth - 4);
    return [
      chartText({
        id: `chart-heatmap-legend-${chart.id}-${index}`,
        order: nextOrder(),
        bounds,
        frame: { x: centerX - width / 2, y: labelY, width, height: labelHeight },
        text: zone.label,
        chart,
        align: 'center',
      }),
    ];
  });
}
