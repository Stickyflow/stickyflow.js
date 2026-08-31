import { finite, paint } from '../renderPrimitives';
import { CHART_COLORS, computeBoxplotStats, mapChartValue } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderBoxplot(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const boxCount = Math.max(1, chart.series.length);
  const boxWidthFraction = Math.min(1, Math.max(.05, chart.config?.boxWidth ?? .6));
  const boxCornerRadius = chart.config?.barCornerRadius ?? 2;
  const showPoints = chart.config?.showBoxplotPoints ?? true;
  const borderColor = chart.config?.barBorderColor || '#000000';
  const borderWidth = finite(chart.config?.barBorderWidth, 1);
  const jitter = (seed: number) => { const h = Math.sin(seed * 12.9898) * 43758.5453; return (h - Math.floor(h)) - .5; };
  const boxLine = (id: string, x1: number, y1: number, x2: number, y2: number, width: number): RenderNode =>
    ({ type: 'path', id, order: nextOrder(), bounds, d: `M ${x1} ${y1} L ${x2} ${y2}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: borderColor }, strokeWidth: width } });
  const slotWidth = plot.width / boxCount, boxWidth = Math.max(4, slotWidth * boxWidthFraction);
  chart.series.forEach((series, seriesIndex) => {
    const stats = computeBoxplotStats(series.values as number[]);
    if (!stats) return;
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const x = plot.x + seriesIndex * slotWidth + slotWidth / 2;
    const minY = plot.y + plot.height - mapChartValue(stats.min, chart.axis_y, plot.height);
    const q1Y = plot.y + plot.height - mapChartValue(stats.q1, chart.axis_y, plot.height);
    const medianY = plot.y + plot.height - mapChartValue(stats.median, chart.axis_y, plot.height);
    const q3Y = plot.y + plot.height - mapChartValue(stats.q3, chart.axis_y, plot.height);
    const maxY = plot.y + plot.height - mapChartValue(stats.max, chart.axis_y, plot.height);
    const capHalf = boxWidth * .2;
    const id = `${chart.id}-${series.id}`;
    nodes.push(boxLine(`chart-box-whisker-lo-${id}`, x, minY, x, q1Y, 1));
    nodes.push(boxLine(`chart-box-whisker-hi-${id}`, x, q3Y, x, maxY, 1));
    nodes.push(boxLine(`chart-box-cap-lo-${id}`, x - capHalf, minY, x + capHalf, minY, 1));
    nodes.push(boxLine(`chart-box-cap-hi-${id}`, x - capHalf, maxY, x + capHalf, maxY, 1));
    nodes.push({ type: 'rect', id: `chart-box-${id}`, order: nextOrder(), bounds, x: x - boxWidth / 2, y: q3Y, width: boxWidth, height: Math.max(1, q1Y - q3Y), rx: boxCornerRadius, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'solid', color: borderColor }, strokeWidth: borderWidth } });
    nodes.push(boxLine(`chart-box-median-${id}`, x - boxWidth / 2, medianY, x + boxWidth / 2, medianY, 2));
    if (showPoints) (series.values as number[]).forEach((value, pi) => {
      nodes.push({ type: 'ellipse', id: `chart-box-point-${id}-${pi}`, order: nextOrder(), bounds, cx: x + jitter(seriesIndex * 10_000 + pi) * boxWidth, cy: plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height), rx: 3, ry: 3, style: { fill: paint(color, diagnostics, chart.id), opacity: .7 } });
    });
  });
  return nodes;
}

