import type { SankeyGraph, SankeyLinkInput, SankeyNodeInput } from './types';

export function createSankeyGraph(nodes: SankeyNodeInput[], links: SankeyLinkInput[]): SankeyGraph {
  const ids = new Set(nodes.map(node => node.id));
  for (const link of links) {
    ids.add(link.source);
    ids.add(link.target);
  }

  const incoming = new Map<string, SankeyLinkInput[]>();
  const outgoing = new Map<string, SankeyLinkInput[]>();
  for (const id of ids) {
    incoming.set(id, []);
    outgoing.set(id, []);
  }
  const validLinks = links.filter(
    link => ids.has(link.source) && ids.has(link.target) && link.value > 0 && link.source !== link.target,
  );
  for (const link of validLinks) {
    outgoing.get(link.source)?.push(link);
    incoming.get(link.target)?.push(link);
  }
  return { ids, links: validLinks, incoming, outgoing };
}
