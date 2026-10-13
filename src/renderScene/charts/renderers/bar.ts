import type { RenderNode } from '../../scene';
import { isHorizontalBar } from '../primitives';
import { renderGroupedBars } from './bar/grouped';
import { renderHorizontalBars } from './bar/horizontal';
import { renderStackedBars } from './bar/stacked';
import type { ChartRenderContext } from './types';

export function renderBar(context: ChartRenderContext): RenderNode[] {
  if (isHorizontalBar(context.chart)) {
    return renderHorizontalBars(context);
  }
  if (context.stackedMode) {
    return renderStackedBars(context, context.stackedMode);
  }
  return renderGroupedBars(context);
}
