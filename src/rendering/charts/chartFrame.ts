import type { Chart } from '../../model/charts';
import { finite } from '../renderPrimitives';
import type { Bounds, SceneRect } from '../scene';
import { CARTESIAN_VALUE_TYPES } from './decorations';

export function buildChartFrame(
  chart: Chart,
  bounds: Bounds,
  plot: { y: number; height: number },
  order: number,
): SceneRect {
  const frame: SceneRect = {
    type: 'rect',
    id: `chart-${chart.id}`,
    order,
    bounds,
    x: chart.x,
    y: chart.y,
    width: chart.width,
    height: chart.height,
    rx: chart.corner_radius ?? 12,
    style: {
      fill: { kind: 'solid', color: chart.fill_color ?? '#ffffff' },
      stroke: { kind: 'solid', color: chart.stroke_color ?? '#475569' },
      strokeWidth: finite(chart.stroke_width, 1),
    },
  };

  if (CARTESIAN_VALUE_TYPES.has(chart.chart_type)) {
    frame.detail = {
      of: 'chartScale',
      valueScale: `${plot.y},${plot.height},${chart.axis_y.min},${chart.axis_y.max}`,
    };
  }

  return frame;
}
