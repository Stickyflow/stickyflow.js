import type { Rect } from '../../../model/geometry/types';
import { findAllOwnerNodes, findOwnerNode, isometricGeometryOf, isPrimary } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { findLiveFaceLinks, findLiveLinks } from '../linkPreview';
import type { DraggedCanvasObject, IsometricLiveSize } from './types';

function externalLiveLinks(svg: SVGSVGElement, ownerId: string, groupIds: Set<string>, bounds: Rect) {
  return findLiveLinks(svg, ownerId, bounds).filter(link => {
    const otherId = link.path.getAttribute(link.draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
    return !otherId || !groupIds.has(otherId);
  });
}

function externalLiveFaceLinks(svg: SVGSVGElement, ownerId: string, groupIds: Set<string>) {
  return findLiveFaceLinks(svg, ownerId).filter(link => {
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
  if (!container || container.getAttribute('data-sf-kind') === 'screen') {
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
  const isometricGeometry = owner.role === 'isometric' ? isometricGeometryOf(primary) : null;
  const isometricSize: IsometricLiveSize | undefined = isometricGeometry
    ? { width: isometricGeometry.width, height: isometricGeometry.height, depth: isometricGeometry.depth }
    : undefined;
  return {
    owner,
    nodes,
    baseTransforms: nodes.map(node => node.getAttribute('transform')),
    overlays,
    overlayBaseTransforms: overlays.map(overlay => overlay.getAttribute('transform')),
    draggedBounds,
    liveLinks: externalLiveLinks(svg, owner.id, groupIds, draggedBounds),
    liveFaceLinks: isometricSize ? externalLiveFaceLinks(svg, owner.id, groupIds) : [],
    isometricSize,
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
