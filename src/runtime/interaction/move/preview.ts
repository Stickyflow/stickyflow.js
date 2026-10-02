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
  for (const canvasObject of drag.canvasObjects) {
    translateNodes(canvasObject.nodes, canvasObject.baseTransforms, dx, dy);
    translateNodes(canvasObject.overlays, canvasObject.overlayBaseTransforms, dx, dy);
    updateLiveLinks(canvasObject.liveLinks, offsetBounds(canvasObject.draggedBounds, dx, dy));
  }
  for (const link of drag.internalLinks) {
    translateNodes(link.nodes, link.baseTransforms, dx, dy);
  }
}
