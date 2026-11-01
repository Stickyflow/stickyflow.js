import type { RenderNode, ScenePaint, ScenePath } from '../renderScene/scene';

const HIT_WIDTH = 16;
const LINE_HIT_WIDTH_PX = 14;

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

const isEmpty = (paint: ScenePaint | undefined) =>
  !paint ||
  paint.kind === 'none' ||
  (paint.kind === 'solid' && (paint.color === 'none' || paint.color === 'transparent'));

// A line without a fill can only be taken on its stroke, so it gets a wider one that stays the same size on the screen at any zoom.
function lineHitArea(node: RenderNode): RenderNode | null {
  if (node.type !== 'path' && node.type !== 'rect' && node.type !== 'ellipse') {
    return null;
  }
  const { identity, style } = node;
  if (
    !identity?.primary ||
    identity.role === 'link' ||
    style.pointerEvents ||
    isEmpty(style.stroke) ||
    !isEmpty(style.fill)
  ) {
    return null;
  }
  return {
    ...node,
    id: `line-hit-${node.id}`,
    identity: { role: identity.role, id: identity.id },
    detail: undefined,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#000000' },
      strokeWidth: LINE_HIT_WIDTH_PX,
      nonScalingStroke: true,
      opacity: 0,
      pointerEvents: 'stroke',
    },
  } as RenderNode;
}

export function withLinkHitAreas(nodes: RenderNode[]): RenderNode[] {
  return nodes.flatMap(node => {
    if (node.type === 'path' && node.identity?.role === 'link' && node.identity.primary) {
      return [node, hitAreaFor(node, node.identity.id)];
    }
    const line = lineHitArea(node);
    return line ? [node, line] : [node];
  });
}
