import { findAllOwnerNodes, findOwnerNode, isPrimary, resolveOwner } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import type { OwnerRef, Viewer } from '../../viewer';
import { findLiveLinks, type LiveLink } from '../linkPreview';

interface TransformedNodes {
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
}

export interface DraggedEntity extends TransformedNodes {
  owner: OwnerRef;
  overlays: SVGGElement[];
  overlayBaseTransforms: (string | null)[];
  draggedBounds: Rect;
  liveLinks: LiveLink[];
}

export interface MoveDragState {
  entities: DraggedEntity[];
  internalLinks: TransformedNodes[];
  pointerId: number;
  startScreen: { x: number; y: number };
  startUser: { x: number; y: number };
  moved: boolean;
}

function selectedMoveGroup(viewer: Viewer, owner: OwnerRef): OwnerRef[] {
  const selection = viewer.getSelection();
  return selection.some(selected => selected.id === owner.id)
    ? selection.filter(selected => selected.role === 'entity')
    : [owner];
}

function draggedEntities(svg: SVGSVGElement, group: OwnerRef[], groupIds: Set<string>): DraggedEntity[] {
  const entities: DraggedEntity[] = [];
  for (const owner of group) {
    const nodes = findAllOwnerNodes(svg, owner.id);
    const primary = findOwnerNode(svg, owner.id, isPrimary);
    if (!nodes.length || !primary) {
      continue;
    }
    const overlays = [...svg.querySelectorAll<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(owner.id)}"]`)];
    const draggedBounds = primary.getBBox();
    const liveLinks = findLiveLinks(svg, owner.id, draggedBounds).filter(link => {
      const otherId = link.path.getAttribute(link.draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
      return !otherId || !groupIds.has(otherId);
    });
    entities.push({
      owner,
      nodes,
      baseTransforms: nodes.map(node => node.getAttribute('transform')),
      overlays,
      overlayBaseTransforms: overlays.map(overlay => overlay.getAttribute('transform')),
      draggedBounds,
      liveLinks,
    });
  }
  return entities;
}

function internalLinks(svg: SVGSVGElement, groupIds: Set<string>): TransformedNodes[] {
  if (groupIds.size < 2) {
    return [];
  }

  const links: TransformedNodes[] = [];
  for (const path of svg.querySelectorAll<SVGPathElement>('path[data-sf-from][data-sf-to]')) {
    const from = path.getAttribute('data-sf-from');
    const to = path.getAttribute('data-sf-to');
    const linkId = path.getAttribute('data-sf-id');
    if (!from || !to || !linkId || !groupIds.has(from) || !groupIds.has(to)) {
      continue;
    }
    const nodes = findAllOwnerNodes(svg, linkId);
    if (nodes.length) {
      links.push({ nodes, baseTransforms: nodes.map(node => node.getAttribute('transform')) });
    }
  }
  return links;
}

export function createMoveDragState(
  viewer: Viewer,
  event: PointerEvent,
  startUser: { x: number; y: number },
): MoveDragState | null {
  const owner = resolveOwner(event.target as Element | null);
  if (owner?.role !== 'entity') {
    return null;
  }

  const group = selectedMoveGroup(viewer, owner);
  const groupIds = new Set(group.map(member => member.id));
  const entities = draggedEntities(viewer.svg, group, groupIds);
  if (!entities.length) {
    return null;
  }

  (event.target as Element).setPointerCapture?.(event.pointerId);
  return {
    entities,
    internalLinks: internalLinks(viewer.svg, groupIds),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    startUser,
    moved: false,
  };
}
