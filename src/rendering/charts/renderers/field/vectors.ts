import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { CHART_COLORS, mapChartValue } from '../../primitives';
import type { ChartRenderContext } from '../types';

export function renderVectorField(context: ChartRenderContext, seriesList: ChartSeries[]): RenderNode[] {
  const nodes: RenderNode[] = [];
  seriesList.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    (series.values as [number, number, number, number][]).forEach((vector, vectorIndex) => {
      nodes.push(createVectorNode(context, series.id, vector, vectorIndex, color));
    });
  });
  return nodes;
}

function createVectorNode(
  context: ChartRenderContext,
  seriesId: string,
  vector: [number, number, number, number],
  vectorIndex: number,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const [x, y, angle, magnitude] = vector;
  const startX = plot.x + mapChartValue(x, chart.axis_x, plot.width);
  const startY = plot.y + plot.height - mapChartValue(y, chart.axis_y, plot.height);
  const endX = plot.x + mapChartValue(x + Math.cos(angle) * magnitude, chart.axis_x, plot.width);
  const endY = plot.y + plot.height - mapChartValue(y + Math.sin(angle) * magnitude, chart.axis_y, plot.height);
  return {
    type: 'path',
    id: `chart-field-vector-${chart.id}-${seriesId}-${vectorIndex}`,
    order: nextOrder(),
    bounds,
    d: `M ${startX} ${startY} L ${endX} ${endY}`,
    markerEnd: 'filled_arrow',
    style: {
      fill: { kind: 'none' },
      stroke: paint(color, diagnostics, chart.id),
      strokeWidth: 2,
    },
  };
}
