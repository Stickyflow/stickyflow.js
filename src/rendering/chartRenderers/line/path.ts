import type { ChartSeries } from '../../../model/charts';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../renderScene';
import type { CartesianPoint } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';

export function createLinePath(
  context: ChartRenderContext,
  series: ChartSeries,
  points: CartesianPoint[],
  color: NonNullable<ChartSeries['color']>,
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const commands = points.map((point, index) => `${index ? 'L' : ''} ${point.x} ${point.y}`);
  return {
    type: 'path',
    id: `chart-line-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: `M ${commands.join(' ')}`,
    style: {
      fill: { kind: 'none' },
      stroke: paint(color, diagnostics, chart.id),
      strokeWidth: 2,
      lineJoin: 'round',
    },
  };
}
