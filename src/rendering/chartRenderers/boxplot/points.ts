import type { ChartSeries } from '../../../model/charts';
import { mapChartValue } from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { BoxplotGeometry, BoxplotLayout } from './types';

export function renderSamplePoints(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  geometry: BoxplotGeometry,
  series: ChartSeries,
  seriesIndex: number,
  id: string,
  color: Parameters<typeof paint>[0],
): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  return (series.values as number[]).map((value, pointIndex) => ({
    type: 'ellipse',
    id: `chart-box-point-${id}-${pointIndex}`,
    order: nextOrder(),
    bounds,
    cx: geometry.centerX + jitter(seriesIndex * 10_000 + pointIndex) * layout.boxWidth,
    cy: plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height),
    rx: 3,
    ry: 3,
    style: { fill: paint(color, diagnostics, chart.id), opacity: 0.7 },
  }));
}

function jitter(seed: number): number {
  const hash = Math.sin(seed * 12.9898) * 43758.5453;
  return hash - Math.floor(hash) - 0.5;
}
