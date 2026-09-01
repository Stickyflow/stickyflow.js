import { findAllOwnerNodes, findOwnerNode, isPrimary } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import type { OwnerRef } from '../../viewer';
import { findLiveLinks } from '../linkPreview';
import type { DraggedEntity } from './types';

function externalLiveLinks(svg: SVGSVGElement, ownerId: string, groupIds: Set<string>, bounds: Rect) {
  return findLiveLinks(svg, ownerId, bounds).filter(link => {
    const otherId = link.path.getAttribute(link.draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
    return !otherId || !groupIds.has(otherId);
  });
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
