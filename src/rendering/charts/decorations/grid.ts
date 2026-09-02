import type { Chart } from '../../../model/charts';
import type { Bounds, RenderNode, SceneStyle } from '../../scene';
import { finite } from '../../scene';
import { chartTicks, mapChartValue } from '../primitives';
import { type ChartLayout, hasCartesianDecorations } from './layout';

export function buildChartGrid(chart: Chart, plot: ChartLayout['plot'], bounds: Bounds, order: number): RenderNode[] {
  if (chart.show_grid === false || !hasCartesianDecorations(chart)) {
    return [];
  }

  const style: SceneStyle = { fill: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' } };
  const width = finite(chart.grid_width, 1);
  const nodes: RenderNode[] = [];
  chartTicks(chart.axis_x).forEach(tick => {
    const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width);
    nodes.push({
      type: 'rect',
      id: `chart-grid-x-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      x: x - width / 2,
      y: plot.y,
      width,
      height: plot.height,
      style,
    });
  });
  chartTicks(chart.axis_y).forEach(tick => {
    const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height);
    nodes.push({
      type: 'rect',
      id: `chart-grid-y-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      x: plot.x,
      y: y - width / 2,
      width: plot.width,
      height: width,
      style,
    });
  });
  return nodes;
}
