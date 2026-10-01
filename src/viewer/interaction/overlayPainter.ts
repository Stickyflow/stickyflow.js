import {
  DERIVED_HEIGHT_ROLES,
  findOwnerNode,
  isPrimary,
  linkSelectionOverlay,
  pathSelectionOverlay,
  quickDuplicateBubbles,
  shapeSelectionOverlay,
} from '../../domContract';
import type { OwnerRef } from '../events';

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
        ? linkSelectionOverlay(document, primary as unknown as SVGPathElement, id, svg)
        : owner?.role === 'path'
          ? pathSelectionOverlay(document, primary as unknown as SVGPathElement, id, svg)
          : shapeSelectionOverlay(document, primary, id, svg, owner ? DERIVED_HEIGHT_ROLES.has(owner.role) : false);
    svg.appendChild(overlay);
    if (owner?.role === 'entity' && selectedIds.size === 1) {
      svg.appendChild(quickDuplicateBubbles(document, primary, id, svg));
    }
  }
}
