import { SANKEY_NODE_WIDTH } from './constants';
import { sankeyNodeX } from './nodeGeometry';
import type { SankeyGraph, SankeyLayoutNode, SankeyNodeGeometry, SankeyNodeInput } from './types';

export function layoutSankeyNodes(
  inputs: SankeyNodeInput[],
  graph: SankeyGraph,
  geometry: SankeyNodeGeometry,
  width: number,
): SankeyLayoutNode[] {
  return [...graph.ids].map(id => {
    const input = inputs.find(node => node.id === id);
    const column = geometry.columns.get(id) ?? 0;
    return {
      id,
      label: input?.label ?? id,
      color: input?.color,
      x: sankeyNodeX(column, geometry.columnCount, width),
      y: geometry.y.get(id) ?? 0,
      width: SANKEY_NODE_WIDTH,
      height: geometry.heights.get(id) ?? 2,
      column,
    };
  });
}
