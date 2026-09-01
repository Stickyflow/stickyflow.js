import type { RenderNode } from '../scene';
import { renderHeatmapCells } from './heatmap/cells';
import { renderHeatmapHeaders } from './heatmap/headers';
import { createHeatmapLayout } from './heatmap/layout';
import { renderHeatmapLegend } from './heatmap/legend';
import type { ChartRenderContext } from './types';

export function renderHeatmap(context: ChartRenderContext): RenderNode[] {
  const layout = createHeatmapLayout(context);
  const nodes: RenderNode[] = [];

  nodes.push(...renderHeatmapCells(context, layout));
  nodes.push(...renderHeatmapHeaders(context, layout));
  nodes.push(...renderHeatmapLegend(context, layout));

  return nodes;
}
