import {
  DERIVED_HEIGHT_ROLES,
  dimensionSelectionOverlay,
  findOwnerNode,
  isometricSelectionOverlay,
  isPrimary,
  linkSelectionOverlay,
  pathSelectionOverlay,
  quickDuplicateBubbles,
  shapeSelectionOverlay,
} from '../../dom';
import type { OwnerRef } from '../events';

const SINGLE_OBJECT_HANDLES =
  '[data-sf-path-point], [data-sf-path-corner], [data-sf-path-insert], [data-sf-dimension-handle]';

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
        ? linkSelectionOverlay(document, primary as SVGPathElement, id, svg)
        : owner?.role === 'dimension'
          ? dimensionSelectionOverlay(document, primary, id, svg)
          : owner?.role === 'path'
            ? pathSelectionOverlay(document, primary as SVGPathElement, id, svg)
            : owner?.role === 'isometric'
              ? isometricSelectionOverlay(document, primary, id, svg)
              : shapeSelectionOverlay(document, primary, id, svg, owner ? DERIVED_HEIGHT_ROLES.has(owner.role) : false);
    // Several objects are moved as one, so the handles that change a single one stay away.
    if (selectedIds.size > 1) {
      for (const handle of overlay.querySelectorAll(SINGLE_OBJECT_HANDLES)) {
        handle.remove();
      }
    }
    svg.appendChild(overlay);
    if (owner?.role === 'shape' && selectedIds.size === 1) {
      svg.appendChild(quickDuplicateBubbles(document, primary, id, svg));
    }
  }
}
