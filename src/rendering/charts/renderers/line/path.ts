import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { linePathData } from '../../primitives/linePath';
import type { CartesianPoint } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';

export function createLinePath(
  context: ChartRenderContext,
  series: ChartSeries,
  points: CartesianPoint[],
  color: string,
  tension: number,
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-line-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    detail: { of: 'chartSeries', series: series.id, lineTension: tension || undefined },
    d: linePathData(points, tension),
    style: {
      fill: { kind: 'none' },
      stroke: paint(color, diagnostics, chart.id),
      strokeWidth: 2,
      lineJoin: 'round',
    },
  };
}
