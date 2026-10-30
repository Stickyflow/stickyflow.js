import type { Rect } from '../../../model/geometry/types';
import { personLabelArea } from '../../../renderScene/artifacts/shape/geometry/roundedForms';
import { updateQuickDuplicateBubbles } from '../../dom';
import { updateLiveLinks } from '../linkPreview';
import { applyInset, NO_INSET } from './geometry';
import { applyCompositeScale, applySingleNodeBounds } from './geometryPreview';
import { updateSelectionOverlay } from './overlayPreview';
import type { ResizeDragState } from './state';
import { applyLiveText } from './textPreview';

function textBoundsFor(kind: string | null, bounds: Rect): Rect {
  return kind === 'person' ? personLabelArea(bounds.x, bounds.y, bounds.width, bounds.height) : bounds;
}

function applyGeometryPreview(drag: ResizeDragState, bounds: Rect): void {
  if (drag.isComposite) {
    applyCompositeScale(drag.geometryNodes, drag.startBounds, bounds, drag.baseTransforms);
    return;
  }

  drag.geometryNodes.forEach((node, index) => {
    // A picture is scaled as it is, so that its crop and its clip go along.
    if (node.tagName.toLowerCase() === 'image') {
      applyCompositeScale([node], drag.startBounds, bounds, [drag.baseTransforms[index]]);
      return;
    }
    applySingleNodeBounds(node, drag.kind, applyInset(bounds, drag.insets[index] ?? NO_INSET));
  });
}

export function applyResizePreview(drag: ResizeDragState, bounds: Rect): void {
  applyGeometryPreview(drag, bounds);
  if (drag.overlay) {
    updateSelectionOverlay(drag.overlay, bounds);
  }
  if (drag.text) {
    applyLiveText(drag.text.el, drag.text.rawText, textBoundsFor(drag.kind, bounds), drag.text.strokeWidth);
  }
  if (drag.bubbles) {
    updateQuickDuplicateBubbles(drag.bubbles, bounds);
  }
  updateLiveLinks(drag.liveLinks, bounds);
}

export { applyCompositeScale, applySingleNodeBounds } from './geometryPreview';
export { applyLiveText } from './textPreview';
