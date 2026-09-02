import type { ChartRamp } from '../../../model/charts';
import { chartText, formatFieldValue } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';

export function renderFieldLegend(context: ChartRenderContext): RenderNode[] {
  const stops = context.chart.config?.scale?.stops;
  if (!context.showLegend || !stops?.length) {
    return [];
  }

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const minimum = sortedStops[0].position;
  const maximum = sortedStops[sortedStops.length - 1].position;
  const geometry = legendGeometry(context);
  return [
    createColorBar(context, sortedStops, minimum, maximum, geometry),
    ...createLegendLabels(context, minimum, maximum, geometry),
  ];
}

interface LegendGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

function legendGeometry(context: ChartRenderContext): LegendGeometry {
  const { plot } = context;
  const width = Math.min(220, plot.width);
  return {
    x: plot.x + (plot.width - width) / 2,
    y: plot.y + plot.height + 46,
    width,
    height: 8,
  };
}

function createColorBar(
  context: ChartRenderContext,
  stops: ChartRamp['stops'],
  minimum: number,
  maximum: number,
  geometry: LegendGeometry,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const span = maximum - minimum;
  return {
    type: 'rect',
    id: `chart-field-colorbar-${chart.id}`,
    order: nextOrder(),
    bounds,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    rx: 2,
    style: {
      fill: {
        kind: 'linear-gradient',
        angle: 0,
        stops: stops.map(stop => ({
          offset: span === 0 ? 0 : ((stop.position - minimum) / span) * 100,
          color: stop.color,
        })),
      },
    },
  };
}

function createLegendLabels(
  context: ChartRenderContext,
  minimum: number,
  maximum: number,
  geometry: LegendGeometry,
): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const y = geometry.y + geometry.height + 3;
  return [
    chartText({
      id: `chart-field-colorbar-min-${chart.id}`,
      order: nextOrder(),
      bounds,
      frame: { x: geometry.x, y, width: 80, height: 16 },
      text: formatFieldValue(minimum),
      chart,
    }),
    chartText({
      id: `chart-field-colorbar-max-${chart.id}`,
      order: nextOrder(),
      bounds,
      frame: { x: geometry.x + geometry.width - 80, y, width: 80, height: 16 },
      text: formatFieldValue(maximum),
      chart,
      align: 'right',
    }),
  ];
}
