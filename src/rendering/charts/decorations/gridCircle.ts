import type { Chart } from '../../../model/charts';
import type { Bounds, RenderNode, SceneStyle } from '../../scene';
import { finite } from '../../scene';
import { chartTicks } from '../primitives';
import { angleForAxisValue } from '../primitives/radarShape';
import { gridLineDashStyle } from './gridLineStyle';
import type { ChartLayout } from './layout';

export function buildCircularChartGrid(
  chart: Chart,
  plot: ChartLayout['plot'],
  bounds: Bounds,
  order: number,
): RenderNode[] {
  const centerX = plot.x + plot.width / 2;
  const centerY = plot.y + plot.height / 2;
  const radius = Math.max(0, Math.min(plot.width, plot.height) / 2);
  const width = finite(chart.grid_width, 1);
  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
    strokeWidth: width,
    ...gridLineDashStyle(chart, width),
  };

  const nodes: RenderNode[] = [];
  chartTicks(chart.axis_y)
    .filter(tick => tick > chart.axis_y.min)
    .forEach(tick => {
      const ringRadius = radius * ringRatio(chart, tick);
      nodes.push({
        type: 'ellipse',
        id: `chart-grid-ring-${chart.id}-${tick}`,
        order: order + nodes.length,
        bounds,
        cx: centerX,
        cy: centerY,
        rx: ringRadius,
        ry: ringRadius,
        style,
      });
    });

  chartTicks(chart.axis_x).forEach(tick => {
    const angle = angleForAxisValue(chart.axis_x.min, chart.axis_x.max, tick);
    const edgeX = centerX + Math.cos(angle) * radius;
    const edgeY = centerY + Math.sin(angle) * radius;
    nodes.push({
      type: 'path',
      id: `chart-grid-spoke-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      d: `M ${centerX} ${centerY} L ${edgeX} ${edgeY}`,
      style,
    });
  });

  return nodes;
}

function ringRatio(chart: Chart, tick: number): number {
  const range = chart.axis_y.max - chart.axis_y.min;
  return range === 0 ? 0 : Math.max(0, Math.min(1, (tick - chart.axis_y.min) / range));
}
