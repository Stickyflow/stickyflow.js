import type { Rect } from '../../../model/geometry/types';
import { findAllOwnerNodes, findOwnerNode, isPrimary } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { findLiveLinks } from '../linkPreview';
import type { DraggedCanvasObject } from './types';

function externalLiveLinks(svg: SVGSVGElement, ownerId: string, groupIds: Set<string>, bounds: Rect) {
  return findLiveLinks(svg, ownerId, bounds).filter(link => {
    const otherId = link.path.getAttribute(link.draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
    return !otherId || !groupIds.has(otherId);
  });
}

function parentContainerBounds(
  svg: SVGSVGElement,
  primary: SVGGraphicsElement,
  groupIds: Set<string>,
): Rect | undefined {
  const parentId = primary.getAttribute('data-sf-parent-frame');
  if (!parentId || groupIds.has(parentId)) {
    return undefined;
  }
  const container = findOwnerNode(svg, parentId, isPrimary);
  if (!container) {
    return undefined;
  }
  const bbox = container.getBBox();
  return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
}

function captureCanvasObject(svg: SVGSVGElement, owner: OwnerRef, groupIds: Set<string>): DraggedCanvasObject | null {
  const nodes = findAllOwnerNodes(svg, owner.id);
  const primary = findOwnerNode(svg, owner.id, isPrimary);
  if (!nodes.length || !primary) {
    return null;
  }

  const overlays = [...svg.querySelectorAll<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(owner.id)}"]`)];
  const draggedBounds = primary.getBBox();
  return {
    owner,
    nodes,
    baseTransforms: nodes.map(node => node.getAttribute('transform')),
    overlays,
    overlayBaseTransforms: overlays.map(overlay => overlay.getAttribute('transform')),
    draggedBounds,
    liveLinks: externalLiveLinks(svg, owner.id, groupIds, draggedBounds),
    containerBounds: parentContainerBounds(svg, primary, groupIds),
  };
}

export function captureDraggedCanvasObjects(
  svg: SVGSVGElement,
  group: OwnerRef[],
  groupIds: Set<string>,
): DraggedCanvasObject[] {
  const canvasObjects: DraggedCanvasObject[] = [];
  for (const owner of group) {
    const canvasObject = captureCanvasObject(svg, owner, groupIds);
    if (canvasObject) {
      canvasObjects.push(canvasObject);
    }
  }
  return canvasObjects;
}
