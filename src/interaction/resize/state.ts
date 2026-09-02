import type { ResizeHandle } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import type { OwnerRef } from '../../viewer';
import { findLiveLinks, type LiveLink } from '../linkPreview';
import { findResizeQuickDuplicateBubbles } from './bubbleCapture';
import { selectResizeTarget } from './selection';
import { captureResizeText, type ResizeTextCapture } from './textCapture';

const COMPOSITE_KINDS = new Set(['cylinder', 'person']);

export interface ResizeDragState {
  owner: OwnerRef;
  handle: ResizeHandle;
  kind: string | null;
  isComposite: boolean;
  geometryNodes: SVGGraphicsElement[];
  overlay: SVGGElement | null;
  bubbles: SVGGElement | null;
  startBounds: Rect;
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

  const startBounds = selection.primary.getBBox();
  selection.captureTarget.setPointerCapture?.(event.pointerId);
  return {
    owner: selection.owner,
    handle: selection.handle,
    kind: selection.primary.getAttribute('data-sf-kind'),
    isComposite: COMPOSITE_KINDS.has(selection.primary.getAttribute('data-sf-kind') ?? ''),
    geometryNodes: selection.geometryNodes,
    overlay: selection.overlay,
    bubbles: findResizeQuickDuplicateBubbles(svg, selection.ownerId, selection.overlay),
    startBounds,
    liveLinks: findLiveLinks(svg, selection.ownerId, startBounds),
    pointerId: event.pointerId,
    moved: false,
    text: captureResizeText(selection.nodes, selection.primary),
  };
}
