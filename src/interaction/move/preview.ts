import { updateLiveLinks } from '../linkPreview';
import { offsetBounds } from './geometry';
import type { MoveDragState } from './state';

function translateNodes(nodes: SVGGraphicsElement[], baseTransforms: (string | null)[], dx: number, dy: number): void {
  nodes.forEach((node, index) => {
    const base = baseTransforms[index];
    node.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
  });
}

export function applyMovePreview(drag: MoveDragState, dx: number, dy: number): void {
  for (const entity of drag.entities) {
    translateNodes(entity.nodes, entity.baseTransforms, dx, dy);
    translateNodes(entity.overlays, entity.overlayBaseTransforms, dx, dy);
    updateLiveLinks(entity.liveLinks, offsetBounds(entity.draggedBounds, dx, dy));
  }
  for (const link of drag.internalLinks) {
    translateNodes(link.nodes, link.baseTransforms, dx, dy);
  }
}
