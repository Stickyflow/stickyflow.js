import type { RenderNode } from '../renderScene';
import { renderCartesian } from './cartesian';
import type { ChartRenderContext } from './types';

export function renderGrid(context: ChartRenderContext): RenderNode[] {
  return renderCartesian(context);
}

