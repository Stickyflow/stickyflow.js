import type { RenderNode } from '../../scene';
import { renderSankeyLinks } from './sankey/links';
import { renderSankeyNodes } from './sankey/nodes';
import { createSankeyRenderData } from './sankey/prepare';
import type { ChartRenderContext } from './types';

export function renderSankey(context: ChartRenderContext): RenderNode[] {
  const data = createSankeyRenderData(context);
  const nodes: RenderNode[] = [];

  nodes.push(...renderSankeyLinks(context, data));
  nodes.push(...renderSankeyNodes(context, data));

  return nodes;
}
