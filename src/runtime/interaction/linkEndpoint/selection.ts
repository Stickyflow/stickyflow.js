import type { LinkEndpoint } from '../../dom';
import { findOwnerNode, isPrimary, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';

export interface SelectedLinkEndpoint {
  captureTarget: Element;
  end: LinkEndpoint;
  path: SVGPathElement;
  linkOwner: OwnerRef;
}

export function selectLinkEndpoint(svg: SVGSVGElement, event: PointerEvent): SelectedLinkEndpoint | null {
  const target = event.target as Element | null;
  const end = target?.closest('[data-sf-link-endpoint]')?.getAttribute('data-sf-link-endpoint') as
    | LinkEndpoint
    | null
    | undefined;
  const overlay = target?.closest('[data-sf-selection-overlay]');
  const linkId = overlay?.getAttribute('data-sf-selection-overlay');
  if (!target || !end || !linkId) {
    return null;
  }

  const path = findOwnerNode(svg, linkId, isPrimary) as unknown as SVGPathElement | null;
  const linkOwner = path && resolveOwner(path);
  if (!path || !linkOwner) {
    return null;
  }

  return { captureTarget: target, end, path, linkOwner };
}
