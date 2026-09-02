import type { Chart } from '../../model/charts';
import type { RenderDiagnostic } from '../scene';
import type { ChartRenderOrder } from './chartRenderOrder';
import type { ChartLayout } from './decorations';
import type { ChartRenderContext } from './renderers';

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
