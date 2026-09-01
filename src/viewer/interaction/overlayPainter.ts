import { findOwnerNode, isPrimary } from '../domQuery';
import type { OwnerRef } from '../events';
import { linkSelectionOverlay, quickDuplicateBubbles, shapeSelectionOverlay } from '../selectionOverlay';

export function paintSelectionOverlays(
  svg: SVGSVGElement,
  selectedIds: ReadonlySet<string>,
  owners: ReadonlyMap<string, OwnerRef>,
): void {
  for (const overlay of svg.querySelectorAll('[data-sf-selection-overlay]')) {
    overlay.remove();
  }
  const document = svg.ownerDocument;
  for (const id of selectedIds) {
    const primary = findOwnerNode(svg, id, isPrimary);
    if (!primary) {
      continue;
    }
    const owner = owners.get(id);
    const overlay =
      owner?.role === 'link'
        ? linkSelectionOverlay(document, primary as unknown as SVGPathElement, id)
        : shapeSelectionOverlay(document, primary, id);
    svg.appendChild(overlay);
    if (owner?.role === 'entity' && selectedIds.size === 1) {
      svg.appendChild(quickDuplicateBubbles(document, primary, id));
    }
  }
}
