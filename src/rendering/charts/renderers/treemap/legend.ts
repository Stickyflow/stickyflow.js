import type { RenderNode } from '../../../scene';
import { boxBounds } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL, formatFieldValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { TreemapLayout } from './types';

const BAR_THICKNESS = 10;
const TICK_LENGTH = 4;
const ROW_GAP = 2;
const CHART_GAP = 16;
const LABEL_SIZE = 34;

export function renderTreemapLegend(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  if (layout.zones.length === 0 || (layout.legendPosition === 'bottom' && layout.legendHeight <= 0)) {
    return [];
  }
  return layout.legendPosition === 'bottom' ? renderBottomLegend(context, layout) : renderSideLegend(context, layout);
}

function bandRatio(layout: TreemapLayout, value: number): number {
  const first = layout.bands[0];
  const last = layout.bands[layout.bands.length - 1];
  return last === first ? 0 : (value - first) / (last - first);
}

function bandStops(layout: TreemapLayout) {
  const bandCount = Math.max(0, layout.bands.length - 1);
  const zones = layout.zones.slice(0, bandCount);
  return zones.map((zone, index) => ({
    offset: bandRatio(layout, layout.bands[index + 1] ?? layout.bands[layout.bands.length - 1]) * 100,
    color: zone.color ?? DEFAULT_ZONE_FILL,
  }));
}

function renderBottomLegend(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const barX = plot.x;
  const barWidth = layout.gridWidth;
  const labelHeight = layout.fontSize + 2;
  const barY = plot.y + layout.gridHeight + CHART_GAP;
  const barBounds = boxBounds({ x: barX, y: barY, width: barWidth, height: BAR_THICKNESS });
  const stops = bandStops(layout);

  const bar: RenderNode = {
    type: 'rect',
    id: `chart-treemap-legend-bar-${chart.id}`,
    order: nextOrder(),
    bounds: barBounds,
    x: barX,
    y: barY,
    width: barWidth,
    height: BAR_THICKNESS,
    rx: 3,
    zoneGradient: { axis: 'y', min: chart.axis_y.min, max: chart.axis_y.max },
    style: {
      fill: stops.length ? { kind: 'linear-gradient', angle: 0, stops } : { kind: 'solid', color: DEFAULT_ZONE_FILL },
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: 1,
    },
  };

  const ticks: RenderNode[] = layout.bands.flatMap((value, index) => {
    const x = barX + bandRatio(layout, value) * barWidth;
    const tick: RenderNode = {
      type: 'path',
      id: `chart-treemap-legend-tick-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      d: `M ${x} ${barY + BAR_THICKNESS} L ${x} ${barY + BAR_THICKNESS + TICK_LENGTH}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
        strokeWidth: 1,
      },
    };
    const isFirst = index === 0;
    const isLast = index === layout.bands.length - 1;
    const align = isFirst ? 'left' : isLast ? 'right' : 'center';
    const frameX = isFirst ? x : isLast ? x - LABEL_SIZE : x - LABEL_SIZE / 2;
    const label = chartText({
      id: `chart-treemap-legend-tick-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      frame: { x: frameX, y: barY + BAR_THICKNESS + TICK_LENGTH + ROW_GAP, width: LABEL_SIZE, height: labelHeight },
      text: formatFieldValue(value),
      chart,
      align,
    });
    return [tick, label];
  });

  return [bar, ...ticks];
}

function renderSideLegend(context: ChartRenderContext, layout: TreemapLayout): RenderNode[] {
  const { chart, plot, bounds, nextOrder } = context;
  const side = layout.legendPosition as 'left' | 'right';
  const barTop = plot.y;
  const barHeight = layout.gridHeight;
  const barX = side === 'left' ? plot.x - CHART_GAP - BAR_THICKNESS : plot.x + layout.gridWidth + CHART_GAP;
  const barBounds = boxBounds({ x: barX, y: barTop, width: BAR_THICKNESS, height: barHeight });
  const stops = bandStops(layout);

  const bar: RenderNode = {
    type: 'rect',
    id: `chart-treemap-legend-bar-${chart.id}`,
    order: nextOrder(),
    bounds: barBounds,
    x: barX,
    y: barTop,
    width: BAR_THICKNESS,
    height: barHeight,
    rx: 3,
    zoneGradient: { axis: 'y', min: chart.axis_y.min, max: chart.axis_y.max },
    style: {
      fill: stops.length ? { kind: 'linear-gradient', angle: 270, stops } : { kind: 'solid', color: DEFAULT_ZONE_FILL },
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: 1,
    },
  };

  const tickX = side === 'left' ? barX : barX + BAR_THICKNESS;
  const tickEndX = side === 'left' ? tickX - TICK_LENGTH : tickX + TICK_LENGTH;
  const labelX = side === 'left' ? tickEndX - ROW_GAP - LABEL_SIZE : tickEndX + ROW_GAP;

  const ticks: RenderNode[] = layout.bands.flatMap((value, index) => {
    const y = barTop + (1 - bandRatio(layout, value)) * barHeight;
    const tick: RenderNode = {
      type: 'path',
      id: `chart-treemap-legend-tick-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      d: `M ${tickX} ${y} L ${tickEndX} ${y}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
        strokeWidth: 1,
      },
    };
    const label = chartText({
      id: `chart-treemap-legend-tick-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      frame: { x: labelX, y: y - layout.fontSize / 2, width: LABEL_SIZE, height: layout.fontSize + 2 },
      text: formatFieldValue(value),
      chart,
      align: side === 'left' ? 'right' : 'left',
    });
    return [tick, label];
  });

  return [bar, ...ticks];
}
