import { assignSankeyColumns } from './columns';
import { createSankeyGraph } from './graph';
import { layoutSankeyLinks } from './links';
import { calculateNodeGeometry } from './nodeGeometry';
import { layoutSankeyNodes } from './nodes';
import type { SankeyLayout, SankeyLinkInput, SankeyNodeInput } from './types';

export function layoutSankey(
  nodeInputs: SankeyNodeInput[],
  linkInputs: SankeyLinkInput[],
  width: number,
  height: number,
): SankeyLayout {
  const graph = createSankeyGraph(nodeInputs, linkInputs);
  if (graph.ids.size === 0) {
    return { nodes: [], links: [] };
  }
  const columns = assignSankeyColumns(graph);
  const geometry = calculateNodeGeometry(graph, columns, height);
  return {
    nodes: layoutSankeyNodes(nodeInputs, graph, geometry, width),
    links: layoutSankeyLinks(graph, geometry, width),
  };
}
