import type { ChartSeries } from '../../../../model/charts';
import { colorWithAlpha } from '../../../color';
import type { Bounds, RenderNode } from '../../../scene';
import { linePathData } from '../../primitives/linePath';
import type { CartesianPoint } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';

export function createLineAreaFill(
  context: ChartRenderContext,
  series: ChartSeries,
  points: CartesianPoint[],
  color: string,
  tension: number,
  areaOpacity: number,
): RenderNode {
  const { chart, plot, nextOrder } = context;
  const baselineY = plot.y + plot.height;
  const first = points[0];
  const last = points[points.length - 1];
  const d = `${linePathData(points, tension)} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  const top = Math.min(...points.map(point => point.y));
  const centerX = (Math.min(...points.map(point => point.x)) + Math.max(...points.map(point => point.x))) / 2;
  const halfHeight = (baselineY - top) / 2;
  const fillBounds: Bounds = {
    minX: centerX - halfHeight,
    maxX: centerX + halfHeight,
    minY: top,
    maxY: baselineY,
  };
  return {
    type: 'path',
    id: `chart-line-area-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds: fillBounds,
    d,
    detail: { of: 'chartSeries', series: series.id },
    style: {
      fill: {
        kind: 'linear-gradient',
        angle: 90,
        stops: [
          { offset: 0, color: colorWithAlpha(color, areaOpacity) },
          { offset: 100, color: colorWithAlpha(color, 0) },
        ],
      },
      stroke: { kind: 'none' },
    },
  };
}
