// Pure Sankey layout geometry, ported from stickyflow-atlas's
// entities/charts/ui/sankey.ts (same family of algorithm as d3-sankey, no
// iterative crossing-minimization pass - node order within a column is
// declaration order). Three steps: (1) longest-path-from-sources layering
// assigns each node a column/depth, (2) a single global value->pixel scale
// (tightest-fitting column wins) keeps flow width comparable across columns
// so conservation is visible, (3) each node's in/out links are stacked
// top-to-bottom on its own edge, proportional to their value.

export interface SankeyNodeInput { id: string; label: string; color?: string; }
export interface SankeyLinkInput { source: string; target: string; value: number; color?: string; }

export interface SankeyLayoutNode {
  id: string; label: string; color?: string;
  x: number; y: number; width: number; height: number; column: number;
}

export interface SankeyLayoutLink {
  source: string; target: string; value: number; color?: string;
  x0: number; x1: number; sourceY0: number; sourceY1: number; targetY0: number; targetY1: number;
}

export interface SankeyLayout {
  nodes: SankeyLayoutNode[];
  links: SankeyLayoutLink[];
}

const NODE_WIDTH = 18;
const NODE_GAP = 8;

export function layoutSankey(nodeInputs: SankeyNodeInput[], linkInputs: SankeyLinkInput[], width: number, height: number): SankeyLayout {
  const allIds = new Set(nodeInputs.map(n => n.id));
  for (const link of linkInputs) { allIds.add(link.source); allIds.add(link.target); }
  if (!allIds.size) return { nodes: [], links: [] };

  const outgoing = new Map<string, SankeyLinkInput[]>();
  const incoming = new Map<string, SankeyLinkInput[]>();
  for (const id of allIds) { outgoing.set(id, []); incoming.set(id, []); }
  // Self-loops and non-positive values have no sane pixel geometry - drop them.
  const validLinks = linkInputs.filter(l => allIds.has(l.source) && allIds.has(l.target) && l.value > 0 && l.source !== l.target);
  for (const link of validLinks) { outgoing.get(link.source)!.push(link); incoming.get(link.target)!.push(link); }

  // Longest-path layering: a node's column is 1 + the max column of any node
  // feeding into it. Capped at |nodes| passes so a malformed cyclic input
  // still terminates instead of looping forever.
  const column = new Map<string, number>();
  for (const id of allIds) column.set(id, 0);
  for (let pass = 0; pass < allIds.size; pass++) {
    let changed = false;
    for (const link of validLinks) {
      const candidate = (column.get(link.source) ?? 0) + 1;
      if (candidate > (column.get(link.target) ?? 0)) { column.set(link.target, candidate); changed = true; }
    }
    if (!changed) break;
  }

  const numColumns = Math.max(1, ...[...column.values()].map(c => c + 1));
  const columnGroups = new Map<number, string[]>();
  for (const id of allIds) {
    const c = column.get(id) ?? 0;
    if (!columnGroups.has(c)) columnGroups.set(c, []);
    columnGroups.get(c)!.push(id);
  }

  // A node's value is its throughput - the larger of what flows in vs out,
  // since a source/sink node only has one side populated.
  const value = new Map<string, number>();
  for (const id of allIds) {
    const inflow = incoming.get(id)!.reduce((sum, l) => sum + l.value, 0);
    const outflow = outgoing.get(id)!.reduce((sum, l) => sum + l.value, 0);
    value.set(id, Math.max(inflow, outflow, 0.0001));
  }

  // One global value->pixel scale: the tightest column (least room per unit
  // of value once its own gaps are subtracted) sets the scale for everyone,
  // so a unit of flow occupies the same height in every column.
  let valueScale = Infinity;
  for (const ids of columnGroups.values()) {
    const total = ids.reduce((sum, id) => sum + value.get(id)!, 0);
    const gaps = Math.max(0, ids.length - 1) * NODE_GAP;
    const usable = Math.max(1, height - gaps);
    if (total > 0) valueScale = Math.min(valueScale, usable / total);
  }
  if (!Number.isFinite(valueScale) || valueScale <= 0) valueScale = 1;

  const nodeX = (c: number) => numColumns <= 1 ? 0 : c * (width - NODE_WIDTH) / (numColumns - 1);

  const nodeY = new Map<string, number>();
  const nodeH = new Map<string, number>();
  for (const ids of columnGroups.values()) {
    let y = 0;
    for (const id of ids) {
      const h = Math.max(2, value.get(id)! * valueScale);
      nodeY.set(id, y); nodeH.set(id, h);
      y += h + NODE_GAP;
    }
  }

  const layoutNodes: SankeyLayoutNode[] = [...allIds].map(id => {
    const input = nodeInputs.find(n => n.id === id);
    return {
      id, label: input?.label ?? id, color: input?.color,
      x: nodeX(column.get(id) ?? 0), y: nodeY.get(id) ?? 0,
      width: NODE_WIDTH, height: nodeH.get(id) ?? 2, column: column.get(id) ?? 0,
    };
  });

  // Stacks each node's own outgoing/incoming links top-to-bottom on its edge,
  // proportional to value - one running offset per node per side.
  const outOffset = new Map<string, number>();
  const inOffset = new Map<string, number>();
  for (const id of allIds) { outOffset.set(id, 0); inOffset.set(id, 0); }

  const layoutLinks: SankeyLayoutLink[] = validLinks.map(link => {
    const sliceHeight = Math.max(0.5, link.value * valueScale);
    const sourceTop = nodeY.get(link.source)!, targetTop = nodeY.get(link.target)!;
    const sourceOffset = outOffset.get(link.source)!;
    outOffset.set(link.source, sourceOffset + sliceHeight);
    const targetOffset = inOffset.get(link.target)!;
    inOffset.set(link.target, targetOffset + sliceHeight);
    return {
      source: link.source, target: link.target, value: link.value, color: link.color,
      x0: nodeX(column.get(link.source)!) + NODE_WIDTH, x1: nodeX(column.get(link.target)!),
      sourceY0: sourceTop + sourceOffset, sourceY1: sourceTop + sourceOffset + sliceHeight,
      targetY0: targetTop + targetOffset, targetY1: targetTop + targetOffset + sliceHeight,
    };
  });

  return { nodes: layoutNodes, links: layoutLinks };
}
