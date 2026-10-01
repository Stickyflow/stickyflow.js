import type { Chart } from '../../../model/chart';
import type { Bounds, RenderNode, SceneStyle } from '../../scene';
import { finite } from '../../scene';
import { chartTicks } from '../primitives';
import { angleForAxisValue } from '../primitives/radarShape';
import { createGridDot } from './gridDots';
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
  const width = finite(chart.gridWidth, 1);

  if (chart.gridLineStyle === 'dotted') {
    return buildDottedCircularGrid(chart, bounds, order, centerX, centerY, radius, width);
  }

  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke: { kind: 'solid', color: chart.gridColor ?? '#e2e8f0' },
    strokeWidth: width,
    ...gridLineDashStyle(chart, width),
  };

  const nodes: RenderNode[] = [];
  chartTicks(chart.axisY)
    .filter(tick => tick > chart.axisY.min)
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

  chartTicks(chart.axisX).forEach(tick => {
    const angle = angleForAxisValue(chart.axisX.min, chart.axisX.max, tick);
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

function buildDottedCircularGrid(
  chart: Chart,
  bounds: Bounds,
  order: number,
  centerX: number,
  centerY: number,
  radius: number,
  width: number,
): RenderNode[] {
  const yTicks = chartTicks(chart.axisY).filter(tick => tick > chart.axisY.min);
  const xTicks = chartTicks(chart.axisX);
  const nodes: RenderNode[] = [];
  yTicks.forEach(yTick => {
    const ringRadius = radius * ringRatio(chart, yTick);
    xTicks.forEach(xTick => {
      const angle = angleForAxisValue(chart.axisX.min, chart.axisX.max, xTick);
      const x = centerX + Math.cos(angle) * ringRadius;
      const y = centerY + Math.sin(angle) * ringRadius;
      const id = `chart-grid-dot-${chart.id}-${xTick}-${yTick}`;
      nodes.push(createGridDot(chart, id, order + nodes.length, bounds, x, y, width, undefined));
    });
  });
  return nodes;
}

function ringRatio(chart: Chart, tick: number): number {
  const range = chart.axisY.max - chart.axisY.min;
  return range === 0 ? 0 : Math.max(0, Math.min(1, (tick - chart.axisY.min) / range));
}
