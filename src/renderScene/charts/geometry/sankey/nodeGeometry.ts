import { groupSankeyColumns } from './columns';
import { SANKEY_NODE_GAP, SANKEY_NODE_WIDTH } from './constants';
import type { SankeyGraph, SankeyNodeGeometry } from './types';

function nodeValues(graph: SankeyGraph): Map<string, number> {
  const values = new Map<string, number>();
  for (const id of graph.ids) {
    const inflow = (graph.incoming.get(id) ?? []).reduce((sum, link) => sum + link.value, 0);
    const outflow = (graph.outgoing.get(id) ?? []).reduce((sum, link) => sum + link.value, 0);
    values.set(id, Math.max(inflow, outflow, 0.0001));
  }
  return values;
}

function calculateValueScale(
  groups: Map<number, string[]>,
  values: Map<string, number>,
  height: number,
  nodeGap: number,
): number {
  let scale = Infinity;
  for (const ids of groups.values()) {
    const total = ids.reduce((sum, id) => sum + (values.get(id) ?? 0), 0);
    const gaps = Math.max(0, ids.length - 1) * nodeGap;
    const usable = Math.max(1, height - gaps);
    if (total > 0) {
      scale = Math.min(scale, usable / total);
    }
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    return 1;
  }
  return scale;
}

export function sankeyNodeX(
  column: number,
  columnCount: number,
  width: number,
  nodeWidth: number = SANKEY_NODE_WIDTH,
): number {
  if (columnCount <= 1) {
    return 0;
  }
  return (column * (width - nodeWidth)) / (columnCount - 1);
}

export function calculateNodeGeometry(
  graph: SankeyGraph,
  columns: Map<string, number>,
  height: number,
  nodeGap: number = SANKEY_NODE_GAP,
): SankeyNodeGeometry {
  const groups = groupSankeyColumns(graph.ids, columns);
  const values = nodeValues(graph);
  const valueScale = calculateValueScale(groups, values, height, nodeGap);
  const y = new Map<string, number>();
  const heights = new Map<string, number>();
  for (const ids of groups.values()) {
    let cursor = 0;
    for (const id of ids) {
      const nodeHeight = Math.max(2, (values.get(id) ?? 0) * valueScale);
      y.set(id, cursor);
      heights.set(id, nodeHeight);
      cursor += nodeHeight + nodeGap;
    }
  }
  return {
    columns,
    y,
    heights,
    valueScale,
    columnCount: Math.max(1, ...[...columns.values()].map(column => column + 1)),
  };
}
