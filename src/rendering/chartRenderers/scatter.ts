import type { RenderNode } from '../renderScene';
import { renderCartesian } from './cartesian';
import type { ChartRenderContext } from './types';

export function renderScatter(context: ChartRenderContext): RenderNode[] {
  return renderCartesian(context);
}

