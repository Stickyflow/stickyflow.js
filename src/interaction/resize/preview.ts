import { updateQuickDuplicateBubbles } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import { updateLiveLinks } from '../linkPreview';
import { applyCompositeScale, applySingleNodeBounds } from './geometryPreview';
import { updateSelectionOverlay } from './overlayPreview';
import type { ResizeDragState } from './state';
import { applyLiveText } from './textPreview';

function applyGeometryPreview(drag: ResizeDragState, bounds: Rect): void {
  if (drag.isComposite) {
    applyCompositeScale(drag.geometryNodes, drag.startBounds, bounds);
    return;
  }

  for (const node of drag.geometryNodes) {
    applySingleNodeBounds(node, drag.kind, bounds);
  }
}

export function applyResizePreview(drag: ResizeDragState, bounds: Rect): void {
  applyGeometryPreview(drag, bounds);
  if (drag.overlay) {
    updateSelectionOverlay(drag.overlay, bounds);
  }
  if (drag.text) {
    applyLiveText(drag.text.el, drag.text.rawText, bounds, drag.text.strokeWidth);
  }
  if (drag.bubbles) {
    updateQuickDuplicateBubbles(drag.bubbles, bounds);
  }
  updateLiveLinks(drag.liveLinks, bounds);
}

export { applyCompositeScale, applySingleNodeBounds } from './geometryPreview';
export { applyLiveText } from './textPreview';
