import type { SankeyGraph } from './types';

export function assignSankeyColumns(graph: SankeyGraph): Map<string, number> {
  const columns = new Map<string, number>();
  for (const id of graph.ids) {
    columns.set(id, 0);
  }
  for (let pass = 0; pass < graph.ids.size; pass++) {
    let changed = false;
    for (const link of graph.links) {
      const candidate = (columns.get(link.source) ?? 0) + 1;
      if (candidate > (columns.get(link.target) ?? 0)) {
        columns.set(link.target, candidate);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return columns;
}

export function groupSankeyColumns(ids: Set<string>, columns: Map<string, number>): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const id of ids) {
    const column = columns.get(id) ?? 0;
    const group = groups.get(column) ?? [];
    group.push(id);
    groups.set(column, group);
  }
  return groups;
}
