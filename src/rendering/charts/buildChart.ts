import type { Chart } from '../../model/chart';
import type { RenderDiagnostic, RenderNode } from '../scene';
import { buildCartesianChart } from './cartesianChart';
import { createChartFoundation } from './chartFoundation';
import { hasCartesianDecorations } from './decorations';
import { buildPolarChart } from './polarChart';
import { isPolarChart } from './renderers';
import { buildUndecoratedChart } from './undecoratedChart';

export function buildChart(chart: Chart, index: number, diagnostics: RenderDiagnostic[]): RenderNode[] {
  if (chart.isVisible === false) {
    return [];
  }

  const foundation = createChartFoundation(chart, index, diagnostics);
  if (isPolarChart(chart.chartType)) {
    return buildPolarChart(foundation);
  }
  if (hasCartesianDecorations(chart)) {
    return buildCartesianChart(foundation);
  }

  return buildUndecoratedChart(foundation);
}
