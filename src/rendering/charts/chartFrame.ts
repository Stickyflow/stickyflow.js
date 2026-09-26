import type { Chart } from '../../model/charts';
import type { Bounds, SceneRect } from '../scene';
import { finite } from '../scene';
import { CARTESIAN_VALUE_TYPES } from './decorations';
import { resolvePieRadii } from './primitives/pieShape';
import { radarCategoryCount, radarRadius } from './primitives/radarShape';

export function buildChartFrame(
  chart: Chart,
  bounds: Bounds,
  plot: { x: number; y: number; width: number; height: number },
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

  if (chart.chart_type === 'pie') {
    const { outerRadius, innerRadius } = resolvePieRadii(
      plot.width,
      plot.height,
      chart.config?.innerRadius,
      chart.config?.pieCornerRadius,
    );
    frame.detail = {
      of: 'pieGeometry',
      pieGeometry: `${plot.x + plot.width / 2},${plot.y + plot.height / 2},${outerRadius},${innerRadius}`,
    };
  }

  if (chart.chart_type === 'radar' || chart.chart_type === 'radial') {
    const configuredCount = (chart.config?.categories?.filter(Boolean) ?? []).length;
    const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
    const count = radarCategoryCount(configuredCount, dataCount);
    const radius = radarRadius(plot.width, plot.height, finite(chart.font_size, 12), chart.show_axis_labels !== false);
    const centerX = plot.x + plot.width / 2;
    const centerY = plot.y + plot.height / 2;
    const curved = chart.chart_type === 'radial' ? 1 : 0;
    frame.detail = {
      of: 'radarGeometry',
      radarGeometry: `${centerX},${centerY},${radius},${chart.axis_y.min},${chart.axis_y.max},${count},${curved}`,
    };
  }

  return frame;
}
