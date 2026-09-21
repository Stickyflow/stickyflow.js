import { type ResizeHandle, symbolDeclaredBounds } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import type { OwnerRef } from '../../viewer';
import { CONTAINER_ROLES, childrenUnionBounds } from '../containerGeometry';
import { isCompositeOwner } from '../geometryRoles';
import { findLiveLinks, type LiveLink } from '../linkPreview';
import { findResizeQuickDuplicateBubbles } from './bubbleCapture';
import { selectResizeTarget } from './selection';
import { captureResizeText, type ResizeTextCapture } from './textCapture';

export interface ResizeDragState {
  owner: OwnerRef;
  handle: ResizeHandle;
  kind: string | null;
  isComposite: boolean;
  geometryNodes: SVGGraphicsElement[];
  baseTransforms: Array<string | null>;
  overlay: SVGGElement | null;
  bubbles: SVGGElement | null;
  startBounds: Rect;
  childrenBounds?: Rect;
  liveLinks: LiveLink[];
  pointerId: number;
  moved: boolean;
  text: ResizeTextCapture | null;
}

export function createResizeDragState(svg: SVGSVGElement, event: PointerEvent): ResizeDragState | null {
  const selection = selectResizeTarget(svg, event);
  if (!selection) {
    return null;
  }

  const startBounds = symbolDeclaredBounds(selection.primary) ?? selection.primary.getBBox();
  const composite = isCompositeOwner(selection.owner);
  const isContainer = CONTAINER_ROLES.has(selection.owner.role);
  selection.captureTarget.setPointerCapture?.(event.pointerId);
  return {
    owner: selection.owner,
    handle: selection.handle,
    kind: selection.primary.getAttribute('data-sf-kind'),
    isComposite: composite,
    geometryNodes: selection.geometryNodes,
    baseTransforms: selection.geometryNodes.map(node => node.getAttribute('transform')),
    overlay: selection.overlay,
    bubbles: findResizeQuickDuplicateBubbles(svg, selection.ownerId, selection.overlay),
    startBounds,
    childrenBounds: isContainer ? childrenUnionBounds(svg, selection.ownerId) : undefined,
    liveLinks: findLiveLinks(svg, selection.ownerId, startBounds),
    pointerId: event.pointerId,
    moved: false,
    text: composite || isContainer ? null : captureResizeText(selection.nodes, selection.primary),
  };
}
