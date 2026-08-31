import type { RenderNode } from '../renderScene';
import { renderCartesian } from './cartesian';
import type { ChartRenderContext } from './types';

export function renderLine(context: ChartRenderContext): RenderNode[] {
  return renderCartesian(context);
}

