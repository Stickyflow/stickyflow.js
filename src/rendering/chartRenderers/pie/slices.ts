import type { ChartSeries } from '../../../model/charts';
import { CHART_COLORS } from '../../chartPrimitives';
import { finite, paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import { createPieSlicePath } from './path';
import type { PieGeometry } from './types';

const START_ANGLE = -Math.PI / 2;
const MAXIMUM_SWEEP = Math.PI * 2 * (359.999 / 360);

export function renderPieSlices(context: ChartRenderContext, geometry: PieGeometry): RenderNode[] {
  const nodes: RenderNode[] = [];
  let angle = START_ANGLE;
  context.chart.series.forEach((series, seriesIndex) => {
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const sweep = (value / geometry.total) * Math.PI * 2;
    if (sweep > 0) {
      nodes.push(createSliceNode(context, geometry, series, seriesIndex, angle, sweep));
      angle += sweep;
    }
  });
  return nodes;
}

function createSliceNode(
  context: ChartRenderContext,
  geometry: PieGeometry,
  series: ChartSeries,
  seriesIndex: number,
  startAngle: number,
  sweep: number,
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const endAngle = startAngle + Math.min(sweep, MAXIMUM_SWEEP);
  return {
    type: 'path',
    id: `chart-pie-slice-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: createPieSlicePath(geometry, startAngle, endAngle),
    style: { fill: paint(color, diagnostics, chart.id) },
  };
}
