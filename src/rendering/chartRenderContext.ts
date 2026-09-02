import type { Chart } from '../model/charts';
import type { ChartLayout } from './chartLayout';
import type { ChartRenderContext } from './chartRenderers';
import type { ChartRenderOrder } from './chartRenderOrder';
import type { RenderDiagnostic } from './scene';

export function createChartRenderContext(
  chart: Chart,
  layout: ChartLayout,
  renderOrder: ChartRenderOrder,
  diagnostics: RenderDiagnostic[],
): ChartRenderContext {
  return {
    chart,
    plot: layout.plot,
    bounds: layout.bounds,
    diagnostics,
    showLabels: layout.showLabels,
    showLegend: layout.showLegend,
    stackedMode: chart.config?.stacked && chart.config.stacked !== 'none' ? chart.config.stacked : undefined,
    nextOrder: renderOrder.next,
  };
}
