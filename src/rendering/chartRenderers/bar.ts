import type { RenderNode } from '../scene';
import { renderGroupedBars } from './bar/grouped';
import { renderStackedBars } from './bar/stacked';
import type { ChartRenderContext, StackedMode } from './types';

export function renderBar(context: ChartRenderContext, stackedMode?: StackedMode): RenderNode[] {
  if (stackedMode) {
    return renderStackedBars(context, stackedMode);
  }
  return renderGroupedBars(context);
}
