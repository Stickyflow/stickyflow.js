import type { RenderNode } from '../../scene';
import { renderMekkoGrid } from './mekko/grid';
import { renderMekkoColumnLabels } from './mekko/labels';
import { createMekkoLayout } from './mekko/layout';
import { renderMekkoColumnSegments } from './mekko/segments';
import type { ChartRenderContext } from './types';

export function renderMekko(context: ChartRenderContext): RenderNode[] {
  const layout = createMekkoLayout(context);
  const nodes = renderMekkoGrid(context, layout);

  layout.columns.forEach((column, columnIndex) => {
    nodes.push(...renderMekkoColumnSegments(context, layout, columnIndex));
    nodes.push(...renderMekkoColumnLabels(context, layout, columnIndex, column));
  });

  return nodes;
}
