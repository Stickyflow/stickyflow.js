import { mapChartValue } from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { BoxplotLayout, BoxplotSeriesMark } from './types';

export function renderSamplePoints(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  mark: BoxplotSeriesMark,
): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  return (mark.series.values as number[]).map((value, pointIndex) => ({
    type: 'ellipse',
    id: `chart-box-point-${mark.id}-${pointIndex}`,
    order: nextOrder(),
    bounds,
    cx: mark.geometry.centerX + jitter(mark.seriesIndex * 10_000 + pointIndex) * layout.boxWidth,
    cy: plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height),
    rx: 3,
    ry: 3,
    style: { fill: paint(mark.color, diagnostics, chart.id), opacity: 0.7 },
  }));
}

function jitter(seed: number): number {
  const hash = Math.sin(seed * 12.9898) * 43758.5453;
  return hash - Math.floor(hash) - 0.5;
}
