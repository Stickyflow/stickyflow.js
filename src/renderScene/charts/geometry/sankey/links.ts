import { SANKEY_NODE_WIDTH } from './constants';
import { sankeyNodeX } from './nodeGeometry';
import type { SankeyGraph, SankeyLayoutLink, SankeyNodeGeometry, SankeyNodeOffset } from './types';

export function layoutSankeyLinks(
  graph: SankeyGraph,
  geometry: SankeyNodeGeometry,
  width: number,
  offsets: Map<string, SankeyNodeOffset>,
): SankeyLayoutLink[] {
  const outgoingOffsets = new Map<string, number>();
  const incomingOffsets = new Map<string, number>();
  for (const id of graph.ids) {
    outgoingOffsets.set(id, 0);
    incomingOffsets.set(id, 0);
  }
  return graph.links.map(link => {
    const sliceHeight = Math.max(0.5, link.value * geometry.valueScale);
    const sourceOffset = offsets.get(link.source);
    const targetOffset = offsets.get(link.target);
    const sourceTop = (geometry.y.get(link.source) ?? 0) + (sourceOffset?.y ?? 0);
    const targetTop = (geometry.y.get(link.target) ?? 0) + (targetOffset?.y ?? 0);
    const sourceSlice = outgoingOffsets.get(link.source) ?? 0;
    const targetSlice = incomingOffsets.get(link.target) ?? 0;
    outgoingOffsets.set(link.source, sourceSlice + sliceHeight);
    incomingOffsets.set(link.target, targetSlice + sliceHeight);
    return {
      source: link.source,
      target: link.target,
      value: link.value,
      color: link.color,
      x0:
        sankeyNodeX(geometry.columns.get(link.source) ?? 0, geometry.columnCount, width) +
        SANKEY_NODE_WIDTH +
        (sourceOffset?.x ?? 0),
      x1: sankeyNodeX(geometry.columns.get(link.target) ?? 0, geometry.columnCount, width) + (targetOffset?.x ?? 0),
      sourceY0: sourceTop + sourceSlice,
      sourceY1: sourceTop + sourceSlice + sliceHeight,
      targetY0: targetTop + targetSlice,
      targetY1: targetTop + targetSlice + sliceHeight,
    };
  });
}
