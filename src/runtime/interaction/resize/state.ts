import type { Rect } from '../../../model/geometry/types';
import { type ResizeHandle, symbolDeclaredBounds } from '../../dom';
import type { OwnerRef } from '../../viewer';
import { CONTAINER_ROLES, childrenUnionBounds } from '../containerGeometry';
import { isCompositeOwner } from '../geometryRoles';
import { findLiveLinks, type LiveLink } from '../linkPreview';
import { findResizeQuickDuplicateBubbles } from './bubbleCapture';
import { type BoundsInset, insetWithin, NO_INSET } from './geometry';
import { selectResizeTarget } from './selection';
import { captureResizeText, type ResizeTextCapture } from './textCapture';
import { captureTextFit, type TextFit } from './textFit';

export interface ResizeDragState {
  owner: OwnerRef;
  handle: ResizeHandle;
  kind: string | null;
  isComposite: boolean;
  geometryNodes: SVGGraphicsElement[];
  insets: BoundsInset[];
  baseTransforms: Array<string | null>;
  overlay: SVGGElement | null;
  bubbles: SVGGElement | null;
  startBounds: Rect;
  childrenBounds?: Rect;
  liveLinks: LiveLink[];
  pointerId: number;
  moved: boolean;
  text: ResizeTextCapture | null;
  textFit: TextFit | null;
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
  const kind = selection.primary.getAttribute('data-sf-kind');
  const text = composite || isContainer ? null : captureResizeText(selection.nodes, selection.primary);
  return {
    owner: selection.owner,
    handle: selection.handle,
    kind,
    isComposite: composite,
    geometryNodes: selection.geometryNodes,
    insets: selection.geometryNodes.map(node =>
      node === selection.primary ? NO_INSET : insetWithin(startBounds, symbolDeclaredBounds(node) ?? node.getBBox()),
    ),
    baseTransforms: selection.geometryNodes.map(node => node.getAttribute('transform')),
    overlay: selection.overlay,
    bubbles: findResizeQuickDuplicateBubbles(svg, selection.ownerId, selection.overlay),
    startBounds,
    childrenBounds: isContainer ? childrenUnionBounds(svg, selection.ownerId) : undefined,
    liveLinks: findLiveLinks(svg, selection.ownerId, startBounds),
    pointerId: event.pointerId,
    moved: false,
    text,
    textFit: text && selection.owner.role === 'shape' && kind !== 'person' ? captureTextFit(text) : null,
  };
}
