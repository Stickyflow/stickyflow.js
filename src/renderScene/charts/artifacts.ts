import type { Chart } from '../../model/chart';
import type { RenderDiagnostic, RenderNode } from '../scene';
import { tag } from '../scene/tagging';
import { buildChart } from './buildChart';

export function buildCharts(charts: readonly Chart[], diagnostics: RenderDiagnostic[]): RenderNode[] {
  return charts.flatMap((chart, index) =>
    tag(buildChart(chart, index, diagnostics), 'chart', chart.id, chart.chartType, chart.title ?? 'Chart'),
  );
}
