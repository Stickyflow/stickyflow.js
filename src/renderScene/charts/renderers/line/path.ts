import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { resolveChartShadow } from '../../primitives';
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
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const config = chart.config;
  const source = series.color;
  const gradient = source && typeof source !== 'string' && source.type === 'gradient' ? source : undefined;
  const glow = config?.lineGlow;
  return {
    type: 'path',
    id: `chart-line-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds: gradient ? { minX: plot.x, maxX: plot.x + plot.width, minY: plot.y, maxY: plot.y + plot.height } : bounds,
    detail: { of: 'chartSeries', series: series.id, lineTension: tension || undefined },
    d: linePathData(points, tension),
    style: {
      fill: { kind: 'none' },
      stroke: paint(gradient ?? color, diagnostics, chart.id),
      strokeWidth: series.strokeWidth ?? config?.lineWidth ?? 2,
      dash: series.dash,
      lineCap: config?.lineWidth === undefined ? undefined : 'round',
      lineJoin: 'round',
      shadow: glow ? { color, opacity: 0.9, blur: glow, dx: 0, dy: 0 } : resolveChartShadow(chart.shadowStyle),
    },
  };
}
