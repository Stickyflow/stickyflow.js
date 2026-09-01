import { findAllOwnerNodes } from '../../domContract';
import type { TransformedNodes } from './types';

function belongsToMoveGroup(path: SVGPathElement, groupIds: Set<string>): boolean {
  const from = path.getAttribute('data-sf-from');
  const to = path.getAttribute('data-sf-to');
  return Boolean(from && to && groupIds.has(from) && groupIds.has(to));
}

export function captureInternalLinks(svg: SVGSVGElement, groupIds: Set<string>): TransformedNodes[] {
  if (groupIds.size < 2) {
    return [];
  }

  const links: TransformedNodes[] = [];
  for (const path of svg.querySelectorAll<SVGPathElement>('path[data-sf-from][data-sf-to]')) {
    const linkId = path.getAttribute('data-sf-id');
    if (!linkId || !belongsToMoveGroup(path, groupIds)) {
      continue;
    }
    const nodes = findAllOwnerNodes(svg, linkId);
    if (nodes.length) {
      links.push({ nodes, baseTransforms: nodes.map(node => node.getAttribute('transform')) });
    }
  }
  return links;
}
