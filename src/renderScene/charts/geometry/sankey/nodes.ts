import { SANKEY_NODE_WIDTH } from './constants';
import { sankeyNodeX } from './nodeGeometry';
import type { SankeyGraph, SankeyLayoutNode, SankeyNodeGeometry, SankeyNodeInput, SankeyNodeOffset } from './types';

export function layoutSankeyNodes(
  inputs: SankeyNodeInput[],
  graph: SankeyGraph,
  geometry: SankeyNodeGeometry,
  width: number,
  offsets: Map<string, SankeyNodeOffset>,
  nodeWidth: number = SANKEY_NODE_WIDTH,
): SankeyLayoutNode[] {
  return [...graph.ids].map(id => {
    const input = inputs.find(node => node.id === id);
    const column = geometry.columns.get(id) ?? 0;
    const offset = offsets.get(id);
    return {
      id,
      label: input?.label ?? id,
      color: input?.color,
      x: sankeyNodeX(column, geometry.columnCount, width, nodeWidth) + (offset?.x ?? 0),
      y: (geometry.y.get(id) ?? 0) + (offset?.y ?? 0),
      width: nodeWidth,
      height: geometry.heights.get(id) ?? 2,
      column,
    };
  });
}
