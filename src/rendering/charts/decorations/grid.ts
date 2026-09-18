import { type Chart, CIRCULAR_GRID_CHART_TYPES } from '../../../model/charts';
import type { Bounds, RenderNode, SceneStyle } from '../../scene';
import { finite } from '../../scene';
import { chartTicks, mapChartValue } from '../primitives';
import { buildCircularChartGrid } from './gridCircle';
import { gridLineDashStyle } from './gridLineStyle';
import { type ChartLayout, hasCartesianDecorations } from './layout';

export function buildChartGrid(chart: Chart, plot: ChartLayout['plot'], bounds: Bounds, order: number): RenderNode[] {
  if (chart.show_grid === false || !hasCartesianDecorations(chart)) {
    return [];
  }

  if (chart.grid_shape === 'circle' && CIRCULAR_GRID_CHART_TYPES.has(chart.chart_type)) {
    return buildCircularChartGrid(chart, plot, bounds, order);
  }

  const width = finite(chart.grid_width, 1);
  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
    strokeWidth: width,
    ...gridLineDashStyle(chart, width),
  };

  const nodes: RenderNode[] = [];
  chartTicks(chart.axis_x).forEach(tick => {
    const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width);
    nodes.push({
      type: 'path',
      id: `chart-grid-x-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      d: `M ${x} ${plot.y} L ${x} ${plot.y + plot.height}`,
      style,
    });
  });
  chartTicks(chart.axis_y).forEach(tick => {
    const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height);
    nodes.push({
      type: 'path',
      id: `chart-grid-y-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      d: `M ${plot.x} ${y} L ${plot.x + plot.width} ${y}`,
      style,
    });
  });
  return nodes;
}
