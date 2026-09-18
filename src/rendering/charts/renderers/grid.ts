import type { RenderNode } from '../../scene';
import { renderScatter } from './scatter';
import type { ChartRenderContext } from './types';

export function renderGrid(context: ChartRenderContext): RenderNode[] {
  return renderScatter(context, 3);
}
