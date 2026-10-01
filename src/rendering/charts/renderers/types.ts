import type { RenderableChart } from '../../../model/chart';
import type { Bounds, RenderDiagnostic, RenderNode } from '../../scene';

export type StackedMode = 'true' | 'percent' | 'waterfall';

export interface ChartRenderContext {
  chart: RenderableChart;
  plot: { x: number; y: number; width: number; height: number };
  bounds: Bounds;
  diagnostics: RenderDiagnostic[];
  showLabels: boolean;
  showLegend: boolean;
  stackedMode?: StackedMode;
  nextOrder: () => number;
}

export type ChartRenderer = (context: ChartRenderContext) => RenderNode[];
