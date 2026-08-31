import type { Chart } from '../../model/charts';
import type { Bounds, RenderDiagnostic } from '../renderScene';

export type StackedMode = 'true' | 'percent' | 'waterfall';

export interface ChartRenderContext {
  chart: Chart;
  plot: { x: number; y: number; width: number; height: number };
  bounds: Bounds;
  diagnostics: RenderDiagnostic[];
  showLabels: boolean;
  showLegend: boolean;
  nextOrder: () => number;
}

