import type { ResizeHandle } from '../../dom';
import { findAllOwnerNodes, findOwnerNode, isPrimary, isTextLabel, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { hasEditableGeometry, isCompositeOwner } from '../geometryRoles';

export interface ResizeSelection {
  captureTarget: SVGGraphicsElement;
  handle: ResizeHandle;
  overlay: SVGGElement | null;
  ownerId: string;
  owner: OwnerRef;
  primary: SVGGraphicsElement;
  nodes: SVGGraphicsElement[];
  geometryNodes: SVGGraphicsElement[];
}

export function selectResizeTarget(svg: SVGSVGElement, event: PointerEvent): ResizeSelection | null {
  const captureTarget = (event.target as Element | null)?.closest?.(
    '[data-sf-resize-handle]',
  ) as SVGGraphicsElement | null;
  if (!captureTarget) {
    return null;
  }

  const overlay = captureTarget.closest('[data-sf-selection-overlay]') as SVGGElement | null;
  const ownerId = overlay?.getAttribute('data-sf-selection-overlay');
  if (!ownerId) {
    return null;
  }

  const primary = findOwnerNode(svg, ownerId, isPrimary);
  const owner = primary && resolveOwner(primary);
  if (!primary || !hasEditableGeometry(owner)) {
    return null;
  }

  const nodes = findAllOwnerNodes(svg, ownerId);
  const geometryNodes = isCompositeOwner(owner) ? nodes : nodes.filter(node => !isTextLabel(node));
  if (!geometryNodes.length) {
    return null;
  }

  return {
    captureTarget,
    handle: captureTarget.getAttribute('data-sf-resize-handle') as ResizeHandle,
    overlay,
    ownerId,
    owner,
    primary,
    nodes,
    geometryNodes,
  };
}
