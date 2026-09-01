import type { RenderNode } from '../renderScene';
import { renderMekkoGrid } from './mekko/grid';
import { renderMekkoColumnLabels } from './mekko/labels';
import { createMekkoLayout } from './mekko/layout';
import { renderMekkoColumnSegments } from './mekko/segments';
import type { ChartRenderContext } from './types';

export function renderMekko(context: ChartRenderContext): RenderNode[] {
  const layout = createMekkoLayout(context);
  const nodes = renderMekkoGrid(context, layout);

  layout.columns.forEach((label, columnIndex) => {
    nodes.push(...renderMekkoColumnSegments(context, layout, columnIndex));
    nodes.push(...renderMekkoColumnLabels(context, layout, columnIndex, label));
  });

  return nodes;
}
