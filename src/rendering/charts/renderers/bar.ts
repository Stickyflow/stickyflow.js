import type { RenderNode } from '../../scene';
import { renderGroupedBars } from './bar/grouped';
import { renderStackedBars } from './bar/stacked';
import type { ChartRenderContext } from './types';

export function renderBar(context: ChartRenderContext): RenderNode[] {
  if (context.stackedMode) {
    return renderStackedBars(context, context.stackedMode);
  }
  return renderGroupedBars(context);
}
