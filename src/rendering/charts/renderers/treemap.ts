import type { RenderNode } from '../../scene';
import { createTreemapLayout } from './treemap/layout';
import { renderTreemapLegend } from './treemap/legend';
import { renderTreemapTiles } from './treemap/tiles';
import type { ChartRenderContext } from './types';

export function renderTreemap(context: ChartRenderContext): RenderNode[] {
  const layout = createTreemapLayout(context);
  const nodes: RenderNode[] = [];

  nodes.push(...renderTreemapTiles(context, layout));
  nodes.push(...renderTreemapLegend(context, layout));

  return nodes;
}
