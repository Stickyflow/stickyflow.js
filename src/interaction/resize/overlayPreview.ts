import type { Bounds } from '../../model/geometry/router';
import { resizeHandlePositions } from '../../viewer/selectionOverlay';

function updateSelectionRing(overlay: SVGGElement, bounds: Bounds): void {
  const ring = overlay.querySelector('rect:not([data-sf-resize-handle])');
  ring?.setAttribute('x', String(bounds.x - 1));
  ring?.setAttribute('y', String(bounds.y - 1));
  ring?.setAttribute('width', String(bounds.width + 2));
  ring?.setAttribute('height', String(bounds.height + 2));
}

export function updateSelectionOverlay(overlay: SVGGElement, bounds: Bounds): void {
  updateSelectionRing(overlay, bounds);
  for (const [centerX, centerY, name] of resizeHandlePositions(bounds)) {
    const handle = overlay.querySelector(`[data-sf-resize-handle="${name}"]`);
    if (!handle) {
      continue;
    }
    const size = Number(handle.getAttribute('width')) || 6;
    handle.setAttribute('x', String(centerX - size / 2));
    handle.setAttribute('y', String(centerY - size / 2));
  }
}
