import { mapChartValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { BoxplotGeometry, BoxplotLayout, BoxplotOrientation, BoxplotStats } from './types';

export function boxplotPoint(orientation: BoxplotOrientation, center: number, value: number): { x: number; y: number } {
  return orientation === 'horizontal' ? { x: value, y: center } : { x: center, y: value };
}

export function createBoxplotGeometry(
  context: ChartRenderContext,
  layout: BoxplotLayout,
  seriesIndex: number,
  stats: BoxplotStats,
): BoxplotGeometry {
  const { chart, plot } = context;
  const { orientation } = layout;
  const valueAt = (value: number): number =>
    orientation === 'horizontal'
      ? plot.x + mapChartValue(value, chart.axisX, plot.width)
      : plot.y + plot.height - mapChartValue(value, chart.axisY, plot.height);
  const center = plot[orientation === 'horizontal' ? 'y' : 'x'] + seriesIndex * layout.slotWidth + layout.slotWidth / 2;
  return {
    center,
    min: valueAt(stats.min),
    q1: valueAt(stats.q1),
    median: valueAt(stats.median),
    q3: valueAt(stats.q3),
    max: valueAt(stats.max),
  };
}
