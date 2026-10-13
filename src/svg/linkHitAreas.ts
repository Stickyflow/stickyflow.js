import type { RenderNode, ScenePath } from '../renderScene/scene';

const HIT_WIDTH = 16;

function hitAreaFor(path: ScenePath, linkId: string): ScenePath {
  return {
    type: 'path',
    id: `link-hit-${linkId}`,
    order: path.order,
    rank: path.rank,
    sequence: path.sequence,
    bounds: path.bounds,
    d: path.d,
    identity: { role: 'link', id: linkId },
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#000000' },
      strokeWidth: HIT_WIDTH,
      opacity: 0,
      pointerEvents: 'stroke',
    },
  };
}

// Invisible, wider strokes under each link so a thin line is easy to hover and click.
export function withLinkHitAreas(nodes: RenderNode[]): RenderNode[] {
  return nodes.flatMap(node =>
    node.type === 'path' && node.identity?.role === 'link' && node.identity.primary
      ? [node, hitAreaFor(node, node.identity.id)]
      : [node],
  );
}
