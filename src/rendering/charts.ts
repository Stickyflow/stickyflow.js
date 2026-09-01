import { CHART_TYPES, type Chart } from '../model/charts';
import {
  buildChartAxes,
  buildChartGrid,
  buildChartRules,
  buildLegend,
  CARTESIAN_VALUE_TYPES,
  chartLayout,
  hasCartesianDecorations,
} from './chartLayout';
import { chartText } from './chartPrimitives';
import { type ChartRenderContext, renderChartMarks, renderRadar } from './chartRenderers';
import { finite, orderOf } from './renderPrimitives';
import type { RenderDiagnostic, RenderNode } from './scene';

export function buildChart(chart: Chart, index: number, diagnostics: RenderDiagnostic[]): RenderNode[] {
  if (chart.is_visible === false) return [];
  if (!CHART_TYPES.includes(chart.chart_type)) {
    diagnostics.push({
      severity: 'warning',
      code: 'unsupported-chart-type',
      entityId: chart.id,
      message: `Unsupported chart type '${chart.chart_type}' — drawn as a plain series plot. Supported: ${CHART_TYPES.join(', ')}.`,
    });
  }
  const order = orderOf(chart, 20_000 + index);
  const layout = chartLayout(chart);
  const { bounds, plot, showLabels, showLegend } = layout;
  const nodes: RenderNode[] = [
    {
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
    },
  ];
  if (CARTESIAN_VALUE_TYPES.has(chart.chart_type)) {
    nodes[0].detail = {
      of: 'chartScale',
      valueScale: `${plot.y},${plot.height},${chart.axis_y.min},${chart.axis_y.max}`,
    };
  }
  let offset = 0.01;
  if (chart.title)
    nodes.push({
      ...chartText(
        `chart-title-${chart.id}`,
        order + offset++,
        bounds,
        plot.x,
        chart.y + 12,
        plot.width,
        20,
        chart.title,
        chart,
      ),
      fontWeight: 'bold',
      fontSize: Math.max(10, finite(chart.font_size, 12)) + 2,
    });
  const legendNodes = buildLegend(chart, plot, bounds, order + offset, diagnostics);
  nodes.push(...legendNodes);
  offset += legendNodes.length;
  const context: ChartRenderContext = {
    chart,
    plot,
    bounds,
    diagnostics,
    showLabels,
    showLegend,
    nextOrder: () => order + offset++,
  };
  if (chart.chart_type === 'radar' || chart.chart_type === 'radial') {
    nodes.push(...renderRadar(context));
    return nodes;
  }
  const gridNodes = buildChartGrid(chart, plot, bounds, order + offset);
  nodes.push(...gridNodes);
  offset += gridNodes.length;
  const stackedMode = chart.config?.stacked && chart.config.stacked !== 'none' ? chart.config.stacked : undefined;
  nodes.push(...renderChartMarks(context, stackedMode));
  if (hasCartesianDecorations(chart)) {
    const ruleNodes = buildChartRules(chart, plot, bounds, order + offset);
    nodes.push(...ruleNodes);
    offset += ruleNodes.length;
  }
  nodes.push(...buildChartAxes(chart, layout, order + offset));
  return nodes;
}
