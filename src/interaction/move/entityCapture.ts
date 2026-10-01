import { findAllOwnerNodes, findOwnerNode, isPrimary } from '../../domContract';
import type { Rect } from '../../model/geometry/routing';
import type { OwnerRef } from '../../viewer';
import { findLiveLinks } from '../linkPreview';
import type { DraggedEntity } from './types';

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

function captureEntity(svg: SVGSVGElement, owner: OwnerRef, groupIds: Set<string>): DraggedEntity | null {
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

export function captureDraggedEntities(svg: SVGSVGElement, group: OwnerRef[], groupIds: Set<string>): DraggedEntity[] {
  const entities: DraggedEntity[] = [];
  for (const owner of group) {
    const entity = captureEntity(svg, owner, groupIds);
    if (entity) {
      entities.push(entity);
    }
  }
  return entities;
}
