import type { Rect } from '../../../model/geometry/types';
import { resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';

export interface EndpointCandidate {
  owner: OwnerRef;
  bounds: Rect;
}

export function collectEndpointCandidates(svg: SVGSVGElement): EndpointCandidate[] {
  const candidates: EndpointCandidate[] = [];

  for (const element of svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary]')) {
    if (element.getAttribute('data-sf-role') === 'link') {
      continue;
    }

    const owner = resolveOwner(element);
    if (owner) {
      candidates.push({ owner, bounds: element.getBBox() });
    }
  }

  return candidates;
}
