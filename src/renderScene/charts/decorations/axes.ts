import type { Chart } from '../../../model/chart';
import type { RenderNode, SceneStyle } from '../../scene';
import { finite } from '../../scene';
import { barCategoryCount, chartText, chartTicks, horizontalRows, isHorizontalBar, mapChartValue, rowTop } from '../primitives';
import { categoryProp } from '../propPath';
import { buildAxisLabels } from './axisLabels';
import { buildBoxplotSeriesYAxisTicks } from './boxplotYAxis';
import { buildCategoricalXAxisTicks, buildSeriesXAxisTicks } from './categoricalXAxis';
import { type ChartLayout, hasCartesianDecorations } from './layout';
import { buildNumericXAxisTicks } from './numericXAxis';
import { buildNumericYAxisTicks } from './numericYAxis';

function isHorizontalBoxplot(chart: Chart): boolean {
  return chart.chartType === 'boxplot' && chart.config?.orientation === 'horizontal';
}

function buildXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (chart.chartType === 'bar') {
    return buildCategoricalXAxisTicks(chart, layout, order);
  }
  if (chart.chartType === 'boxplot' && !isHorizontalBoxplot(chart)) {
    return buildSeriesXAxisTicks(chart, layout, order);
  }
  return buildNumericXAxisTicks(chart, layout, order);
}

function buildYAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (isHorizontalBoxplot(chart)) {
    return buildBoxplotSeriesYAxisTicks(chart, layout, order);
  }
  return chart.showValueAxis === false ? [] : buildNumericYAxisTicks(chart, layout, order);
}

function xTickPositions(chart: Chart, layout: ChartLayout): number[] {
  const { plot } = layout;
  if (chart.chartType === 'bar') {
    const count = barCategoryCount(chart);
    return Array.from({ length: count }, (_value, index) => plot.x + ((index + 0.5) * plot.width) / count);
  }
  return chartTicks(chart.axisX).map(tick => plot.x + mapChartValue(tick, chart.axisX, plot.width));
}

function axisLineDash(chart: Chart, width: number): Pick<SceneStyle, 'dash' | 'lineCap'> {
  if (chart.axisLineStyle === 'dashed') {
    return { dash: [width * 3, width * 2] };
  }
  return chart.axisLineStyle === 'dotted' ? { dash: [0.1, width * 3], lineCap: 'round' } : {};
}

function buildAxisLines(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const lineWidth = finite(chart.axisLineWidth, 0);
  const tickLength = finite(chart.tickLength, 0);
  if (lineWidth <= 0 && tickLength <= 0) {
    return [];
  }
  const { plot, bounds } = layout;
  const bottom = plot.y + plot.height;
  const style: SceneStyle = {
    fill: { kind: 'none' },
    stroke: { kind: 'solid', color: chart.axisLineColor ?? chart.gridColor ?? '#94a3b8' },
    strokeWidth: lineWidth > 0 ? lineWidth : 1,
    pointerEvents: 'none',
    ...axisLineDash(chart, lineWidth > 0 ? lineWidth : 1),
  };
  const nodes: RenderNode[] = [];
  const add = (id: string, d: string) =>
    nodes.push({ type: 'path', id: `chart-axis-${id}-${chart.id}`, order: order + nodes.length, bounds, d, style });
  if (lineWidth > 0) {
    if (chart.showValueAxis !== false) {
      add('line-y', `M ${plot.x} ${plot.y} L ${plot.x} ${bottom}`);
    }
    add('line-x', `M ${plot.x} ${bottom} L ${plot.x + plot.width} ${bottom}`);
  }
  if (tickLength > 0 && !isHorizontalBoxplot(chart) && !isHorizontalBar(chart)) {
    chartTicks(chart.axisY).forEach(tick => {
      const y = bottom - mapChartValue(tick, chart.axisY, plot.height);
      add(`tick-y-${tick}`, `M ${plot.x - tickLength} ${y} L ${plot.x} ${y}`);
    });
    xTickPositions(chart, layout).forEach((x, index) => {
      add(`tick-x-${index}`, `M ${x} ${bottom} L ${x} ${bottom + tickLength}`);
    });
  }
  return nodes;
}

function categoryNames(chart: Chart, count: number): string[] {
  const names = (chart.config as { categories?: string[] } | undefined)?.categories;
  return Array.from({ length: count }, (_value, index) => names?.[index] ?? String(index + 1));
}

// Horizontal bars: category labels per row (left of the plot, or above each bar), value ticks along the bottom.
function buildHorizontalBarAxes(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const { plot, bounds } = layout;
  const rows = horizontalRows(chart, plot);
  const above = chart.categoryAlign === 'left';
  const editable = Boolean((chart.config as { categories?: string[] } | undefined)?.categories?.length);
  const nodes: RenderNode[] = categoryNames(chart, rows.count).map((name, index) => {
    const top = rowTop(rows, plot, index);
    return {
      ...chartText({
        role: 'axis',
        id: `chart-y-category-${chart.id}-${index}`,
        order: order + index,
        bounds,
        frame: above
          ? { x: plot.x, y: top, width: plot.width, height: rows.labelRow }
          : { x: chart.x + 8, y: top + rows.barsHeight / 2 - 9, width: plot.x - chart.x - 16, height: 18 },
        text: name,
        chart,
        align: above ? 'left' : 'right',
      }),
      prop: editable ? categoryProp(index) : undefined,
    };
  });
  if (chart.showValueAxis !== false) {
    chartTicks(chart.axisY).forEach((tick, index) => {
      const x = plot.x + mapChartValue(tick, chart.axisY, plot.width);
      nodes.push(
        chartText({
          role: 'axis',
          id: `chart-x-tick-${chart.id}-${tick}`,
          order: order + rows.count + index,
          bounds,
          frame: { x: x - 20, y: plot.y + plot.height + 4 + finite(chart.tickLength, 0), width: 40, height: 18 },
          text: String(tick),
          chart,
          align: 'center',
        }),
      );
    });
  }
  return nodes;
}

export function buildChartAxes(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (!hasCartesianDecorations(chart)) {
    return [];
  }
  const lines = buildAxisLines(chart, layout, order);
  if (!layout.showLabels) {
    return lines;
  }
  order += lines.length;
  if (isHorizontalBar(chart)) {
    return [...lines, ...buildHorizontalBarAxes(chart, layout, order)];
  }

  const xTicks = buildXAxisTicks(chart, layout, order);
  const yTicks = buildYAxisTicks(chart, layout, order + xTicks.length);
  const labels = buildAxisLabels(chart, layout, order + xTicks.length + yTicks.length);
  return [...lines, ...xTicks, ...yTicks, ...labels];
}
