import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { mapChartValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { boxplotPoint } from './geometry';
import type { BoxplotLayout, BoxplotSeriesMark } from './types';

export function renderSamplePoints(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  mark: BoxplotSeriesMark,
): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const valueAt = (value: number): number =>
    layout.orientation === 'horizontal'
      ? plot.x + mapChartValue(value, chart.axisX, plot.width)
      : plot.y + plot.height - mapChartValue(value, chart.axisY, plot.height);
  if (layout.pointSize <= 0) {
    return [];
  }
  return (mark.series.values as number[]).map((value, pointIndex) => {
    const center = mark.geometry.center + jitter(mark.seriesIndex * 10_000 + pointIndex) * layout.jitter * layout.boxWidth;
    const { x, y } = boxplotPoint(layout.orientation, center, valueAt(value));
    return {
      type: 'ellipse',
      id: `chart-box-point-${mark.id}-${pointIndex}`,
      order: nextOrder(),
      bounds,
      cx: x,
      cy: y,
      rx: layout.pointSize,
      ry: layout.pointSize,
      style: { fill: paint(mark.color, diagnostics, chart.id), opacity: layout.pointOpacity },
    };
  });
}

function jitter(seed: number): number {
  const hash = Math.sin(seed * 12.9898) * 43758.5453;
  return hash - Math.floor(hash) - 0.5;
}
