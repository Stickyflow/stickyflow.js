import { assignSankeyColumns } from './columns';
import { SANKEY_NODE_GAP, SANKEY_NODE_WIDTH } from './constants';
import { createSankeyGraph } from './graph';
import { layoutSankeyLinks } from './links';
import { calculateNodeGeometry } from './nodeGeometry';
import { layoutSankeyNodes } from './nodes';
import type { SankeyLayout, SankeyLayoutOptions, SankeyLinkInput, SankeyNodeInput, SankeyNodeOffset } from './types';

function collectOffsets(inputs: SankeyNodeInput[]): Map<string, SankeyNodeOffset> {
  const offsets = new Map<string, SankeyNodeOffset>();
  for (const input of inputs) {
    if (input.offsetX || input.offsetY) {
      offsets.set(input.id, { x: input.offsetX ?? 0, y: input.offsetY ?? 0 });
    }
  }
  return offsets;
}

export function layoutSankey(
  nodeInputs: SankeyNodeInput[],
  linkInputs: SankeyLinkInput[],
  width: number,
  height: number,
  options: SankeyLayoutOptions = { nodeWidth: SANKEY_NODE_WIDTH, nodeGap: SANKEY_NODE_GAP },
): SankeyLayout {
  const graph = createSankeyGraph(nodeInputs, linkInputs);
  if (graph.ids.size === 0) {
    return { nodes: [], links: [] };
  }
  const columns = assignSankeyColumns(graph);
  const geometry = calculateNodeGeometry(graph, columns, height, options.nodeGap);
  const offsets = collectOffsets(nodeInputs);
  return {
    nodes: layoutSankeyNodes(nodeInputs, graph, geometry, width, offsets, options.nodeWidth),
    links: layoutSankeyLinks(graph, geometry, width, offsets, options.nodeWidth),
  };
}
