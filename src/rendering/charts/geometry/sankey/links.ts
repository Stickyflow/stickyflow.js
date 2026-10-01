import { SANKEY_NODE_WIDTH } from './constants';
import { sankeyNodeX } from './nodeGeometry';
import type { SankeyGraph, SankeyLayoutLink, SankeyNodeGeometry } from './types';

export function layoutSankeyLinks(graph: SankeyGraph, geometry: SankeyNodeGeometry, width: number): SankeyLayoutLink[] {
  const outgoingOffsets = new Map<string, number>();
  const incomingOffsets = new Map<string, number>();
  for (const id of graph.ids) {
    outgoingOffsets.set(id, 0);
    incomingOffsets.set(id, 0);
  }
  return graph.links.map(link => {
    const sliceHeight = Math.max(0.5, link.value * geometry.valueScale);
    const sourceTop = geometry.y.get(link.source) ?? 0;
    const targetTop = geometry.y.get(link.target) ?? 0;
    const sourceOffset = outgoingOffsets.get(link.source) ?? 0;
    const targetOffset = incomingOffsets.get(link.target) ?? 0;
    outgoingOffsets.set(link.source, sourceOffset + sliceHeight);
    incomingOffsets.set(link.target, targetOffset + sliceHeight);
    return {
      source: link.source,
      target: link.target,
      value: link.value,
      color: link.color,
      x0: sankeyNodeX(geometry.columns.get(link.source) ?? 0, geometry.columnCount, width) + SANKEY_NODE_WIDTH,
      x1: sankeyNodeX(geometry.columns.get(link.target) ?? 0, geometry.columnCount, width),
      sourceY0: sourceTop + sourceOffset,
      sourceY1: sourceTop + sourceOffset + sliceHeight,
      targetY0: targetTop + targetOffset,
      targetY1: targetTop + targetOffset + sliceHeight,
    };
  });
}
