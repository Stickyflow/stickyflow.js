import type { Chart } from '../../../model/chart';
import type { Bounds, RenderNode, SceneStyle } from '../../scene';
import { finite } from '../../scene';
import { fieldSurfaceClip } from '../field/grid';
import { CIRCULAR_GRID_CHART_TYPES } from '../gridSupport';
import { chartTicks, mapChartValue } from '../primitives';
import { buildCircularChartGrid } from './gridCircle';
import { createGridDot } from './gridDots';
import { gridLineDashStyle } from './gridLineStyle';
import { type ChartLayout, hasCartesianDecorations } from './layout';

export function buildChartGrid(chart: Chart, plot: ChartLayout['plot'], bounds: Bounds, order: number): RenderNode[] {
  if (chart.showGrid === false || !hasCartesianDecorations(chart)) {
    return [];
  }

  if (chart.gridShape === 'circle' && CIRCULAR_GRID_CHART_TYPES.has(chart.chartType)) {
    return buildCircularChartGrid(chart, plot, bounds, order);
  }

  const width = finite(chart.gridWidth, 1);
  const clip = chart.chartType === 'field' ? fieldSurfaceClip(chart, plot) : undefined;
  if (chart.gridLineStyle === 'dotted') {
    return buildDottedRectGrid(chart, plot, bounds, order, width, clip);
  }

  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke: { kind: 'solid', color: chart.gridColor ?? '#e2e8f0' },
    strokeWidth: width,
    ...gridLineDashStyle(chart, width),
    clip,
  };

  const nodes: RenderNode[] = [];
  chartTicks(chart.axisX).forEach(tick => {
    const x = plot.x + mapChartValue(tick, chart.axisX, plot.width);
    nodes.push({
      type: 'path',
      id: `chart-grid-x-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      d: `M ${x} ${plot.y} L ${x} ${plot.y + plot.height}`,
      style,
    });
  });
  chartTicks(chart.axisY).forEach(tick => {
    const y = plot.y + plot.height - mapChartValue(tick, chart.axisY, plot.height);
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

function buildDottedRectGrid(
  chart: Chart,
  plot: ChartLayout['plot'],
  bounds: Bounds,
  order: number,
  width: number,
  clip: SceneStyle['clip'],
): RenderNode[] {
  const xTicks = chartTicks(chart.axisX);
  const yTicks = chartTicks(chart.axisY);
  const nodes: RenderNode[] = [];
  xTicks.forEach(xTick => {
    const x = plot.x + mapChartValue(xTick, chart.axisX, plot.width);
    yTicks.forEach(yTick => {
      const y = plot.y + plot.height - mapChartValue(yTick, chart.axisY, plot.height);
      const id = `chart-grid-dot-${chart.id}-${xTick}-${yTick}`;
      nodes.push(createGridDot(chart, id, order + nodes.length, bounds, x, y, width, clip));
    });
  });
  return nodes;
}
