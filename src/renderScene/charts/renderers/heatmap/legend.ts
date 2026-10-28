import type { RenderNode } from '../../../scene';
import { boxBounds } from '../../../scene';
import { chartText, DEFAULT_ZONE_FILL, formatFieldValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

const BAR_THICKNESS = 10;
const TICK_LENGTH = 4;
const ROW_GAP = 2;
const LABEL_WIDTH = 48;

// Where the bar lies: the square it fills, and which way it runs.
interface BarPlace {
  x: number;
  y: number;
  width: number;
  height: number;
  vertical: boolean;
  // The side the numbers stand at.
  numbers: 'top' | 'bottom' | 'left' | 'right';
}

// The color bar goes on the side that the chart names. Names of rows or columns on that side stay beside the grid, so the bar lies outside them.
function barPlace(layout: HeatmapLayout): BarPlace {
  const { grid, sides, reservedSpace, legendGap } = layout;
  const rowRoom = reservedSpace.rowHeaders;
  const columnRoom = reservedSpace.columnHeaders;
  switch (sides.legend) {
    case 'top': {
      const edge = grid.y - (sides.columns === 'top' ? columnRoom : 0);
      return {
        x: grid.x,
        y: edge - legendGap - BAR_THICKNESS,
        width: grid.width,
        height: BAR_THICKNESS,
        vertical: false,
        numbers: 'top',
      };
    }
    case 'left': {
      const edge = grid.x - (sides.rows === 'left' ? rowRoom : 0);
      return {
        x: edge - legendGap - BAR_THICKNESS,
        y: grid.y,
        width: BAR_THICKNESS,
        height: grid.height,
        vertical: true,
        numbers: 'left',
      };
    }
    case 'right': {
      const edge = grid.x + grid.width + (sides.rows === 'right' ? rowRoom : 0);
      return {
        x: edge + legendGap,
        y: grid.y,
        width: BAR_THICKNESS,
        height: grid.height,
        vertical: true,
        numbers: 'right',
      };
    }
    default: {
      const edge = grid.y + grid.height + (sides.columns === 'bottom' ? columnRoom : 0);
      return {
        x: grid.x,
        y: edge + legendGap,
        width: grid.width,
        height: BAR_THICKNESS,
        vertical: false,
        numbers: 'bottom',
      };
    }
  }
}

export function renderHeatmapLegend(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.reservedSpace.legend <= 0 || layout.zones.length === 0) {
    return [];
  }

  const place = barPlace(layout);
  const barBounds = boxBounds({ x: place.x, y: place.y, width: place.width, height: place.height });

  return [createGradientBar(context, layout, place, barBounds), ...createBoundaryTicks(context, layout, place)];
}

function bandRatio(layout: HeatmapLayout, value: number): number {
  const first = layout.bands[0];
  const last = layout.bands[layout.bands.length - 1];
  return last === first ? 0 : (value - first) / (last - first);
}

function createGradientBar(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  place: BarPlace,
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
    id: `chart-heatmap-legend-bar-${chart.id}`,
    order: nextOrder(),
    bounds: barBounds,
    x: place.x,
    y: place.y,
    width: place.width,
    height: place.height,
    rx: 3,
    zoneGradient: { axis: 'y', min: chart.axisY.min, max: chart.axisY.max },
    style: {
      // Across the grid it runs from the lowest value on the left; beside it from the lowest at the bottom.
      fill: stops.length
        ? { kind: 'linear-gradient', angle: place.vertical ? 270 : 0, stops }
        : { kind: 'solid', color: DEFAULT_ZONE_FILL },
      stroke: { kind: 'solid', color: chart.gridColor ?? '#e2e8f0' },
      strokeWidth: 1,
    },
  };
}

function createBoundaryTicks(context: ChartRenderContext, layout: HeatmapLayout, place: BarPlace): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const labelHeight = layout.fontSize + 2;
  const lastIndex = layout.bands.length - 1;

  return layout.bands.flatMap((value, index) => {
    const ratio = bandRatio(layout, value);
    const at = place.vertical ? place.y + place.height - ratio * place.height : place.x + ratio * place.width;
    const tickPath = tickPathAt(place, at);
    const tick: RenderNode = {
      type: 'path',
      id: `chart-heatmap-legend-tick-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      d: tickPath,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: chart.gridColor ?? '#e2e8f0' },
        strokeWidth: 1,
      },
    };
    const label = chartText({
      id: `chart-heatmap-legend-tick-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      ...labelAt(place, at, index === 0, index === lastIndex, labelHeight),
      text: formatFieldValue(value),
      chart,
    });
    return [tick, label];
  });
}

// The short line from the bar to its number, on the side of the numbers.
function tickPathAt(place: BarPlace, at: number): string {
  if (place.vertical) {
    const from = place.numbers === 'right' ? place.x + place.width : place.x;
    const to = place.numbers === 'right' ? from + TICK_LENGTH : from - TICK_LENGTH;
    return `M ${from} ${at} L ${to} ${at}`;
  }
  const from = place.numbers === 'bottom' ? place.y + place.height : place.y;
  const to = place.numbers === 'bottom' ? from + TICK_LENGTH : from - TICK_LENGTH;
  return `M ${at} ${from} L ${at} ${to}`;
}

// The frame and the alignment of a number. Across the grid the first and the last number lie inside the bar's ends, the others centre on the tick.
function labelAt(place: BarPlace, at: number, first: boolean, last: boolean, labelHeight: number) {
  if (place.vertical) {
    const onRight = place.numbers === 'right';
    const x = onRight ? place.x + place.width + TICK_LENGTH + ROW_GAP : place.x - TICK_LENGTH - ROW_GAP - LABEL_WIDTH;
    return {
      frame: { x, y: at - labelHeight / 2, width: LABEL_WIDTH, height: labelHeight },
      align: onRight ? ('left' as const) : ('right' as const),
    };
  }
  const y =
    place.numbers === 'bottom'
      ? place.y + place.height + TICK_LENGTH + ROW_GAP
      : place.y - TICK_LENGTH - ROW_GAP - labelHeight;
  const x = first ? at : last ? at - LABEL_WIDTH : at - LABEL_WIDTH / 2;
  return {
    frame: { x, y, width: LABEL_WIDTH, height: labelHeight },
    align: first ? ('left' as const) : last ? ('right' as const) : ('center' as const),
  };
}
