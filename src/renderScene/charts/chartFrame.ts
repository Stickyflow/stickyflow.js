import type { Chart } from '../../model/chart';
import type { Bounds, SceneRect } from '../scene';
import { finite, paint } from '../scene';
import { CARTESIAN_VALUE_TYPES } from './decorations';
import { isHorizontalBar } from './primitives';
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
    rx: chart.cornerRadius ?? 12,
    style: {
      fill: paint(chart.fillColor ?? '#ffffff', [], chart.id),
      stroke: { kind: 'solid', color: chart.strokeColor ?? '#475569' },
      strokeWidth: finite(chart.strokeWidth, 1),
    },
  };

  if (CARTESIAN_VALUE_TYPES.has(chart.chartType)) {
    // Horizontal bars read their value along x: the scale then describes the plot's x range.
    const range = isHorizontalBar(chart) ? `${plot.x},${plot.width}` : `${plot.y},${plot.height}`;
    frame.detail = {
      of: 'chartScale',
      valueScale: `${range},${chart.axisY.min},${chart.axisY.max}${isHorizontalBar(chart) ? ',horizontal' : ''}`,
    };
  }

  if (chart.chartType === 'pie') {
    const { outerRadius, innerRadius, cornerRadius } = resolvePieRadii(
      plot.width,
      plot.height,
      chart.config?.innerRadius,
      chart.config?.pieCornerRadius,
    );
    frame.detail = {
      of: 'pieGeometry',
      pieGeometry: `${plot.x + plot.width / 2},${plot.y + plot.height / 2},${outerRadius},${innerRadius},${cornerRadius}`,
    };
  }

  if (chart.chartType === 'polarArea') {
    const maxRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
    const innerRadius = Math.max(0, Math.min(finite(chart.config?.innerRadius, 0), maxRadius - 1));
    const cornerRadius = Math.max(0, finite(chart.config?.pieCornerRadius, 0));
    frame.detail = {
      of: 'pieGeometry',
      pieGeometry: `${plot.x + plot.width / 2},${plot.y + plot.height / 2},${maxRadius},${innerRadius},${cornerRadius}`,
    };
  }

  if (chart.chartType === 'radar' || chart.chartType === 'radial') {
    const configuredCount = (chart.config?.categories?.filter(Boolean) ?? []).length;
    const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
    const count = radarCategoryCount(configuredCount, dataCount);
    const radius = radarRadius(plot.width, plot.height, finite(chart.fontSize, 12), chart.showAxisLabels !== false);
    const centerX = plot.x + plot.width / 2;
    const centerY = plot.y + plot.height / 2;
    const curved = chart.chartType === 'radial' ? 1 : 0;
    frame.detail = {
      of: 'radarGeometry',
      radarGeometry: `${centerX},${centerY},${radius},${chart.axisY.min},${chart.axisY.max},${count},${curved}`,
    };
  }

  return frame;
}
